// app/(admin)/opportunities/new/page.tsx
"use client";
import OpportunityForm from "@/components/admin/OpportunityForm";

export default function NewOpportunityPage() {
  return (
    <div className="space-y-6">
      <h1 className="page-title">Create New Opportunity</h1>
      <OpportunityForm />
    </div>
  );
}
