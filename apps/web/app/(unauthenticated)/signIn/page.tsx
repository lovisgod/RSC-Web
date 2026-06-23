// "use client";

// import { useState } from "react";
// import Link from "next/link";
// import { Button, Input } from "@rsc/ui";

// export default function SignInPage() {
//   const [identifier, setIdentifier] = useState("");
//   const [password, setPassword] = useState("");

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     console.log({ identifier, password });

//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
//       <div className="w-full max-w-md bg-rsc-panel rounded-rsc shadow-rsc p-8 border border-rsc-line">
//         {/* Header Block */}
//         <div className="text-center mb-6">
//           <h1 className="text-3xl font-extrabold tracking-tight">
//             <span className="text-rsc-auth">RSC</span>{" "}
//             <span className="text-rsc-accent-deep">Food</span>
//           </h1>
//           <p className="text-rsc-muted mt-2 text-sm">
//             Welcome back! Log in to order delicious meals.
//           </p>
//         </div>

//         {/* Form Block */}
//         <form onSubmit={handleSubmit} className="space-y-5">
//           <Input
//             label="Email or Phone"
//             type="text"
//             value={identifier}
//             onChange={(e) => setIdentifier(e.target.value)}
//             placeholder="adaeze.o@gmail.com"
//             required
//           />

//           <Input
//             label="Password"
//             type="password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             placeholder="••••••••"
//             required
//           />

//           <Button type="submit" tone="auth" className="w-full mt-2">
//             Log In
//           </Button>
//         </form>

//         {/* Footer Link */}
//         <p className="text-center text-sm text-rsc-muted mt-6">
//           Don&apos;t have an account?{" "}
//           <Link href="/signUp" className="text-rsc-accent-deep font-bold hover:underline">
//             Register
//           </Link>
//         </p>
//       </div>
//     </div>
//   );
// }

// apps/web/src/app/signIn/page.tsx
"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input } from "@rsc/ui";
import { LoginInputSchema, type LoginInput } from "@rsc/contracts";

export default function SignInPage() {
  // 🛰️ 1. THE NETWORK LAYER: Tracks HTTP request status & isPending lifecycle
  const { mutate, isPending } = useMutation({
    mutationFn: async (credentials: LoginInput) => {
      // 📝 Real backend fetch/axios call goes here down the line
      console.log("Network request fired with payload:", credentials);
    },
    onSuccess: () => {
      // 🎉 Secure HttpOnly cookie handling redirect
      window.location.href = "/dashboard";
    },
    onError: (error) => {
      console.error("API authentication failed:", error);
    },
  });
  //   2.
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginInputSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      console.log("Sending credentials to backend API...", data);

      // 📝 TODO: Connect this to your real TanStack useLoginMutation hook later
      const mockApiResponse = { success: true, user: {} };

      if (mockApiResponse.success) {
        // 🚀 SENIOR TIP: Use window.location instead of router.push for Auth redirecting!
        window.location.assign("/dashboard");
      }
    } catch (error) {
      console.error("Sign in failed:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md bg-rsc-panel rounded-rsc shadow-rsc p-8 border border-rsc-line">
        {/* Header Block */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="text-rsc-auth-strong">RSC</span>{" "}
            <span className="text-rsc-accent-deep">Food</span>
          </h1>
          <p className="text-rsc-muted mt-2 text-sm">
            Welcome back! Log in to order delicious meals.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email or Phone Number"
            type="text"
            placeholder="adaeze.o@gmail.com or 08031234567"
            error={errors.identifier?.message}
            {...register("identifier")}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password")}
          />

          <Button type="submit" tone="auth" className="w-full mt-4">
            Log In
          </Button>
        </form>

        {/* Footer Navigation Link */}
        <p className="text-center text-sm text-rsc-muted mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signUp" className="text-rsc-auth font-bold hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
