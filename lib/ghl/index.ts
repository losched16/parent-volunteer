// lib/ghl/index.ts

interface GHLConfig {
  apiKey: string;
  locationId: string;
}

interface GHLContactData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  customFields?: { id: string; value: string | number }[];
  tags?: string[];
}

class GHLClient {
  private apiKey: string;
  private locationId: string;
  private baseUrl = "https://services.leadconnectorhq.com";

  constructor(config: GHLConfig) {
    this.apiKey = config.apiKey;
    this.locationId = config.locationId;
  }

  private async request(method: string, endpoint: string, body?: any, retries = 3): Promise<any> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method,
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "Version": "2021-07-28",
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          const error = await response.text();
          console.error(`GHL API Error (attempt ${attempt}):`, response.status, error);
          if (attempt === retries) throw new Error(`GHL API Error: ${response.status} - ${error}`);
          await new Promise((r) => setTimeout(r, 1000 * attempt));
          continue;
        }

        return response.json();
      } catch (error) {
        if (attempt === retries) throw error;
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  async createOrUpdateContact(data: GHLContactData): Promise<{ id: string }> {
    // Try to find existing contact by email
    try {
      const searchResult = await this.request(
        "GET",
        `/contacts/?locationId=${this.locationId}&query=${encodeURIComponent(data.email)}`
      );

      if (searchResult?.contacts?.length > 0) {
        const contactId = searchResult.contacts[0].id;
        await this.updateContact(contactId, data);
        return { id: contactId };
      }
    } catch (error) {
      console.log("No existing contact found, creating new one");
    }

    // Create new contact
    const result = await this.request("POST", "/contacts/", {
      locationId: this.locationId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      customFields: data.customFields,
      tags: data.tags,
    });

    return { id: result.contact?.id || result.id };
  }

  async updateContact(contactId: string, data: Partial<GHLContactData>): Promise<void> {
    await this.request("PUT", `/contacts/${contactId}`, {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      customFields: data.customFields,
    });
  }

  async addTag(contactId: string, tag: string): Promise<void> {
    await this.request("POST", `/contacts/${contactId}/tags`, {
      tags: [tag],
    });
  }

  async removeTag(contactId: string, tag: string): Promise<void> {
    await this.request("DELETE", `/contacts/${contactId}/tags`, {
      tags: [tag],
    });
  }

  async triggerWorkflow(workflowId: string, contactId: string): Promise<void> {
    await this.request("POST", `/contacts/${contactId}/workflow/${workflowId}`, {
      eventStartTime: new Date().toISOString(),
    });
  }

  async updateVolunteerHours(
    contactId: string,
    hoursCompleted: number,
    hoursRequired: number,
    lastVolunteerDate?: string
  ): Promise<void> {
    const customFields: { id: string; value: string | number }[] = [];

    // Note: These field IDs need to be mapped via admin settings
    // Using field keys as placeholders - real IDs come from GHL
    const fieldMappings: Record<string, string | number> = {
      volunteer_hours_completed: hoursCompleted,
      volunteer_hours_required: hoursRequired,
      volunteer_hours_remaining: Math.max(0, hoursRequired - hoursCompleted),
    };

    if (lastVolunteerDate) {
      fieldMappings.last_volunteer_date = lastVolunteerDate;
    }

    // Convert to custom field format (admin configures actual field IDs)
    Object.entries(fieldMappings).forEach(([key, value]) => {
      customFields.push({ id: key, value });
    });

    await this.updateContact(contactId, { customFields });
  }
}

// Factory function
export function createGHLClient(apiKey?: string, locationId?: string): GHLClient | null {
  const key = apiKey || process.env.GHL_API_KEY;
  const locId = locationId || process.env.GHL_LOCATION_ID;

  if (!key || !locId) {
    console.warn("GHL credentials not configured - GHL sync disabled");
    return null;
  }

  return new GHLClient({ apiKey: key, locationId: locId });
}

// High-level sync functions
export async function syncParentToGHL(parent: {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  student_names: string;
  total_hours_completed: number;
  ghl_contact_id?: string | null;
}, requiredHours: number): Promise<string | null> {
  const client = createGHLClient();
  if (!client) return null;

  try {
    const result = await client.createOrUpdateContact({
      email: parent.email,
      firstName: parent.first_name,
      lastName: parent.last_name,
      phone: parent.phone,
      customFields: [
        { id: "volunteer_hours_completed", value: parent.total_hours_completed },
        { id: "volunteer_hours_required", value: requiredHours },
        { id: "volunteer_hours_remaining", value: Math.max(0, requiredHours - parent.total_hours_completed) },
        { id: "student_names", value: parent.student_names },
      ],
      tags: ["volunteer_portal_active"],
    });

    return result.id;
  } catch (error) {
    console.error("Failed to sync parent to GHL:", error);
    return null;
  }
}

export async function updateGHLHours(
  ghlContactId: string,
  hoursCompleted: number,
  requiredHours: number
): Promise<void> {
  const client = createGHLClient();
  if (!client || !ghlContactId) return;

  try {
    await client.updateVolunteerHours(
      ghlContactId,
      hoursCompleted,
      requiredHours,
      new Date().toISOString().split("T")[0]
    );

    // Add/remove completion tag
    if (hoursCompleted >= requiredHours) {
      await client.addTag(ghlContactId, "volunteer_hours_complete");
    } else {
      try {
        await client.removeTag(ghlContactId, "volunteer_hours_complete");
      } catch {}
    }

    // Milestone tags
    const milestones = [5, 10, 15, 20];
    for (const milestone of milestones) {
      if (hoursCompleted >= milestone) {
        try {
          await client.addTag(ghlContactId, `volunteer_milestone_${milestone}hrs`);
        } catch {}
      }
    }
  } catch (error) {
    console.error("Failed to update GHL hours:", error);
  }
}

export { GHLClient };
