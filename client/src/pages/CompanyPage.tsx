import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCompany, useUpdateCompany } from "@/hooks/use-company";
import { insertCompanySchema } from "@shared/schema";
import { type InsertCompany } from "@shared/routes";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Save, Building2 } from "lucide-react";

export default function CompanyPage() {
  const { user } = useAuth();
  const { data: company, isLoading } = useCompany();
  const { mutate: saveCompany, isPending } = useUpdateCompany();
  const { toast } = useToast();

  const form = useForm<InsertCompany>({
    resolver: zodResolver(insertCompanySchema),
    defaultValues: {
      userId: user?.id,
      name: "",
      abn: "",
      address: "",
      industry: "",
      description: "",
      contactEmail: user?.email || "",
      contactPhone: "",
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (company) {
      form.reset({
        userId: user?.id,
        name: company.name,
        abn: company.abn || "",
        address: company.address || "",
        industry: company.industry || "",
        description: company.description || "",
        contactEmail: company.contactEmail || user?.email || "",
        contactPhone: company.contactPhone || "",
      });
    } else if (user) {
      form.setValue("userId", user.id);
    }
  }, [company, user, form]);

  const onSubmit = (data: InsertCompany) => {
    saveCompany(data, {
      onSuccess: () => {
        toast({
          title: "Profile Saved",
          description: "Your company details have been updated successfully.",
        });
      },
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-gray-900">Company Profile</h2>
          <p className="text-gray-500 mt-1">Manage your business details and capabilities.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar Info */}
          <div className="space-y-6">
            <Card className="bg-primary text-white border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Profile Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-blue-100 uppercase font-semibold tracking-wider">Verification</p>
                    <p className="font-medium">{company?.isVerified ? "Verified ✅" : "Unverified"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-100 uppercase font-semibold tracking-wider">Completion</p>
                    <div className="w-full bg-blue-900/30 h-2 rounded-full mt-2">
                      <div className="bg-white h-2 rounded-full w-[75%]" />
                    </div>
                    <p className="text-right text-xs mt-1">75%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">Why complete your profile?</p>
              <p>A complete profile helps our AI better match tenders to your capabilities and increases trust with agencies.</p>
            </div>
          </div>

          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Business Details</CardTitle>
                <CardDescription>
                  This information will be used to auto-fill tender applications.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Acme Corp Pty Ltd" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="abn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ABN / ACN</FormLabel>
                            <FormControl>
                              <Input placeholder="12 345 678 901" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry</FormLabel>
                          <FormControl>
                            <Input placeholder="Construction, IT, Consulting..." {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Capabilities & Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe your core business capabilities and experience..." 
                              className="min-h-[120px]"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            This helps our AI match relevant tenders to you.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="font-medium text-gray-900">Contact Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="contactEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="contactPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="0400 000 000" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Business St, Sydney NSW 2000" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={isPending} className="w-full md:w-auto min-w-[150px]">
                        {isPending ? (
                          <>Saving <Loader2 className="ml-2 w-4 h-4 animate-spin"/></>
                        ) : (
                          <>Save Changes <Save className="ml-2 w-4 h-4" /></>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
