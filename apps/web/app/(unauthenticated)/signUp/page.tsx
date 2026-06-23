// apps/web/src/app/signUp/page.tsx
"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input } from "@rsc/ui";
import { RegisterInputSchema, type RegisterInput } from "@rsc/contracts";
import { z } from "zod";
import { useRouter } from "next/navigation";

const clientSignUpSchema = RegisterInputSchema.extend({
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ClientSignUpInput = z.infer<typeof clientSignUpSchema>;

export default function SignUpPage() {
  const router = useRouter();
  // Initialize the hook with our combined Zod contract validation resolver
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientSignUpInput>({
    resolver: zodResolver(clientSignUpSchema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (data: ClientSignUpInput) => {
    // Everything is automatically validated by your Zod contract here!
    // Safe to strip confirmPassword and pass data to your useRegisterMutation hook
    const { confirmPassword, ...apiPayload } = data;
    console.log("Valid Form Submission Data:", apiPayload);

    try {
      // 📝 TODO: Wire this up to your real TanStack useRegisterMutation later.
      // Mocking a successful API response for now:
      console.log("Sending payload to backend API...", apiPayload);
      const mockApiResponse = { success: true, status: "unverified" };

      if (mockApiResponse.success) {
        // 🚀 Smoothly route user to the verification view and hand off the phone number via query string!
        router.push(`/verify?phone=${encodeURIComponent(apiPayload.phoneNumber)}`);
      }
    } catch (error) {
      console.error("Registration request failed:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4 py-12">
      <div className="w-full max-w-md bg-rsc-panel rounded-rsc shadow-rsc p-8 border border-rsc-line">
        {/* Header Block */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="text-rsc-auth-strong">RSC</span>{" "}
            <span className="text-rsc-accent-deep">Food</span>
          </h1>
          <p className="text-rsc-muted mt-2 text-sm">
            Create an account to order fresh meals from local vendors.
          </p>
        </div>

        {/* Registration Form */}
        {/* Form Block */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            placeholder="Adaeze Okafor"
            error={errors.name?.message}
            {...register("name")} // 📝 Register field bindings
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="adaeze.o@gmail.com"
            error={errors.email?.message}
            {...register("email")}
          />

          <Input
            label="Phone Number"
            type="tel"
            placeholder="08031234567"
            maxLength={11}
            error={errors.phoneNumber?.message}
            {...register("phoneNumber")}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password")}
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          <Button type="submit" tone="auth" className="w-full mt-4">
            Register Account
          </Button>
        </form>

        {/* Footer Navigation Link */}
        <p className="text-center text-sm text-rsc-muted mt-6">
          Already have an account?{" "}
          <Link href="/signIn" className="text-rsc-accent-deep font-bold hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
