"use client";

import { useParsedProfile } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyValueList, DataTable } from "@/components/sections/ProfileTab";

export default function ProfilePage() {
  const { data: profile, isLoading } = useParsedProfile();

  return (
    <WorkspaceSection
      title={profile?.title || "Child Profile"}
      icon="👤"
      isLoading={isLoading}
    >
      {profile && (
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="medical">Medical</TabsTrigger>
            <TabsTrigger value="partners">Partners</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <KeyValueList
                  data={{
                    Name: profile.basicInfo.name,
                    "Date of Birth": profile.basicInfo.dateOfBirth,
                    Age: profile.basicInfo.age,
                    Diagnosis: profile.basicInfo.diagnosis,
                    "Current Stage": profile.basicInfo.currentStage,
                    "Postal Code": profile.basicInfo.postalCode,
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="personal" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <KeyValueList
                  data={{
                    Communication: profile.personalProfile.communication,
                    Sensory: profile.personalProfile.sensory,
                    Interests: profile.personalProfile.interests,
                    Strengths: profile.personalProfile.strengths,
                    Challenges: profile.personalProfile.challenges,
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="medical" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Medications</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  headers={[
                    "Medication",
                    "Dose",
                    "Frequency",
                    "Prescriber",
                    "Status",
                  ]}
                  rows={profile.medical.medications.map((m) => ({
                    medication: m.medication,
                    dose: m.dose,
                    frequency: m.frequency,
                    prescriber: m.prescriber,
                    status: m.status,
                  }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Doctors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {profile.medical.doctors.map((doc, i) => (
                    <div key={i}>
                      <p className="text-sm font-medium text-foreground">
                        {doc.name}
                      </p>
                      <p className="text-xs text-warm-400">
                        {doc.role} — {doc.organization} — {doc.phone}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Upcoming Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {profile.medical.appointments.map((apt, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded shrink-0">
                        {apt.date}
                      </span>
                      <span className="text-sm text-foreground">
                        {apt.description}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="partners" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <DataTable
                  headers={[
                    "Role",
                    "Name",
                    "Organization",
                    "Contact",
                    "Notes",
                  ]}
                  rows={profile.journeyPartners.map((p) => ({
                    role: p.role,
                    name: p.name,
                    organization: p.organization,
                    contact: p.contact,
                    notes: p.notes,
                  }))}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </WorkspaceSection>
  );
}
