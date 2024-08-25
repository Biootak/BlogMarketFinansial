// "use client";

// import React from "react";
// import { useFormState } from 'react-dom';
// import { zodResolver } from "@hookform/resolvers/zod";
// import { useForm } from "react-hook-form";
// import { forgotPassword } from "@/actions/auth-actions";
// import Input from "@/components/Input/Input";
// import ButtonPrimary from "@/components/Button/ButtonPrimary";
// import NcLink from "@/components/NcLink/NcLink";
// import Logo from "@/components/Logo/Logo";
// import { usePathname } from 'next/navigation';
// import { ForgotPasswordSchema } from "@/schemas";

// type FormData = {
//   email: string;
// };

// const initialState = {
//   success: false,
//   message: null as string | null,
// };

// function SubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
//   return (
//     <ButtonPrimary type="submit" disabled={isSubmitting}>
//       {isSubmitting ? 'در حال ارسال...' : 'ارسال لینک بازیابی'}
//     </ButtonPrimary>
//   );
// }

// function Message({ success, message }: { success: boolean, message: string | null }) {
//   if (!message) return null;
//   return <p className={`text-sm mt-2 font-semibold ${success ? 'text-green-500' : 'text-red-500'}`}>{message}</p>;
// }

// export default function ForgotPasswordForm() {
//   const [state, formAction] = useFormState(forgotPassword, initialState);
//   const pathname = usePathname();

//   const {
//     register,
//     handleSubmit,
//     formState: { errors, isSubmitting },
//   } = useForm<FormData>({
//     resolver: zodResolver(ForgotPasswordSchema),
//   });

//   const onSubmit = (data: FormData) => {
//     const formData = new FormData();
//     formData.append('email', data.email);
//     formAction(formData);
//   };

//   return (
//     <div className="forgot-password">
//       <div className="text-center max-w-2xl mx-auto mb-4 sm:mb-6">
//         <div className="flex items-center justify-center mb-4 sm:mb-6">
//           <Logo />
//         </div>
//         <p className="text-xl font-medium">فراموشی رمز عبور</p>
//         <p className="text-small text-default-500">
//           ایمیل خود را برای بازیابی رمز عبور وارد کنید
//         </p>
//       </div>

//       <div className="max-w-md mx-auto space-y-6">
//         <form className="grid grid-cols-1 gap-4" onSubmit={handleSubmit(onSubmit)}>
//           <label className="block">
//             <span className="text-neutral-800 dark:text-neutral-200">
//               ایمیل
//             </span>
//             <Input
//               {...register("email")}
//               type="email"
//               placeholder="آدرس ایمیل خود را وارد کنید"
//               className="mt-1"
//             />
//             {errors.email && (
//               <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
//             )}
//           </label>
//           <Message success={state.success} message={state.message} />
//           <SubmitButton isSubmitting={isSubmitting} />
//         </form>
//         <span className="block text-center text-neutral-700 dark:text-neutral-400">
//           بازگشت به |
//           <NcLink className={`text-sm p-1 ${pathname === '/signin' ? 'font-bold' : ''}`} href="/signin">
//             ورود
//           </NcLink>
//           {" / "}
//           <NcLink className={`text-sm p-1 ${pathname === '/signup' ? 'font-bold' : ''}`} href="/signup">
//             ثبت نام
//           </NcLink>
//         </span>
//       </div>
//     </div>
//   );
// }