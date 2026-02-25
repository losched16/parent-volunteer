// app/(admin)/opportunities/[id]/edit/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import OpportunityForm from "@/components/admin/OpportunityForm";
import Loading from "@/components/ui/Loading";
import Link from "next/link";

export default function EditOpportunityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [opportunity, setOpportunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/admin/opportunities")
        .then((r) => r.json())
        .then((data) => {
          const opp = data.opportunities?.find((o: any) => o.id === params.id);
          setOpportunity(opp);
        })
        .finally(() => setLoading(false));
    }
  }, [status, params.id]);

  if (loading) return <Loading />;
  if (!opportunity) return <div className="py-8 text-center text-gray-500">Opportunity not found.</div>;

  return (
    <div className="space-y-6">
      <Link href="/admin/opportunities" className="text-sm text-brand-600 hover:underline">
        ← Back to Opportunities
      </Link>
      <h1 className="page-title">Edit Opportunity</h1>
      <OpportunityForm initialData={opportunity} isEdit />
    </div>
  );
}
