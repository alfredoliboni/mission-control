"use client";

import { useParsedBenefits } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { BenefitRow } from "@/components/sections/BenefitRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyValueList } from "@/components/sections/ProfileTab";

export default function BenefitsPage() {
  const { data: benefits, isLoading } = useParsedBenefits();

  return (
    <WorkspaceSection
      title="Benefits"
      icon="💰"
      lastUpdated={benefits?.lastUpdated}
      agentMonitoring={benefits?.agentMonitoring}
      isLoading={isLoading}
    >
      {benefits && (
        <div className="space-y-6">
          {/* Status overview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading">
                Application Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {benefits.statusTable.map((b, i) => (
                  <BenefitRow key={i} benefit={b} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed eligibility */}
          {benefits.details.length > 0 && (
            <section>
              <h2 className="font-heading text-lg font-semibold text-foreground mb-3">
                Detailed Eligibility
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {benefits.details.map((detail, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        {detail.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <KeyValueList
                        data={{
                          Eligibility: detail.eligibility,
                          Amount: detail.amount,
                          Unlocks: detail.unlocks,
                          "How Applied": detail.howApplied,
                          "Expected Response": detail.expectedResponse,
                          "Documents Needed": detail.documentsNeeded,
                        }}
                      />
                      {detail.action && (
                        <p className="mt-3 text-xs font-medium text-status-caution">
                          ⚠️ {detail.action}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </WorkspaceSection>
  );
}
