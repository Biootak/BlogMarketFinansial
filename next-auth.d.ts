import type { Role } from '@/types/types';
import type { DefaultSession } from 'next-auth'
import { JWT } from "next-auth/jwt"

export type ExtendUser = DefaultSession['user'] & {
    role: Role
}



declare module 'next-auth' {
    interface Session {
        user: ExtendUser
    }
}