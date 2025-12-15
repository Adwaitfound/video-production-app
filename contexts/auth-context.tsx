"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

type UserRole = "admin" | "employee" | "client" | "project_manager"

interface User {
    id: string
    email: string
    full_name: string
    role: UserRole
    avatar_url?: string
    company_name?: string
}

interface AuthContextType {
    user: User | null
    supabaseUser: SupabaseUser | null
    setUser: (user: User | null) => void
    logout: () => Promise<void>
    loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        // Check active sessions and sets the user
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                console.log('Auth context init: session user:', session?.user?.email)

                if (session?.user) {
                    setSupabaseUser(session.user)
                    // Fetch user data from users table
                    const { data: usersData, error } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', session.user.id)

                    console.log('Auth context: fetched user profile', {
                        email: session.user.email,
                        rows: usersData?.length,
                        error: error?.message
                    })

                    if (usersData && usersData.length > 0) {
                        setUser(usersData[0])
                    }
                }
            } catch (err: any) {
                console.error('Auth context init error:', err.message)
            } finally {
                setLoading(false)
            }
        }

        initAuth()

        // Listen for changes on auth state
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state change event:', event, 'user:', session?.user?.email)

            if (session?.user) {
                setSupabaseUser(session.user)
                // Fetch user data from users table
                const { data: usersData, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)

                console.log('Auth state change: fetched user profile', {
                    email: session.user.email,
                    rows: usersData?.length,
                    error: error?.message
                })

                if (usersData && usersData.length > 0) {
                    setUser(usersData[0])
                } else {
                    // If profile doesn't exist, create a default one
                    console.warn('User profile not found, creating default profile')
                    setUser({
                        id: session.user.id,
                        email: session.user.email || '',
                        full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
                        role: 'project_manager',
                        avatar_url: session.user.user_metadata?.avatar_url,
                        company_name: session.user.user_metadata?.company_name
                    })
                }
            } else {
                setSupabaseUser(null)
                setUser(null)
            }
            setLoading(false)
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [supabase])

    const logout = async () => {
        setUser(null)
        setSupabaseUser(null)
        await supabase.auth.signOut()
        router.push("/")
        router.refresh()
    }

    return (
        <AuthContext.Provider value={{ user, supabaseUser, setUser, logout, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}
