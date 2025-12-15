"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { debug } from "@/lib/debug"

type UserRole = "admin" | "employee" | "client" | "project_manager"

interface User {
    id: string
    email: string
    full_name: string
    role: UserRole
    avatar_url?: string
    company_name?: string
    phone?: string
    bio?: string
    website?: string
    industry?: string
    address?: string
    tax_id?: string
    company_size?: string
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
                debug.log('AUTH', 'Initializing auth context...')
                const { data: { session } } = await supabase.auth.getSession()
                console.log('Auth context init: session user:', session?.user?.email)
                debug.log('AUTH', 'Session fetched', { email: session?.user?.email, userId: session?.user?.id })

                if (session?.user) {
                    setSupabaseUser(session.user)
                    // Fetch user data from users table
                    debug.log('AUTH', 'Fetching user profile from users table...', { userId: session.user.id })
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
                        debug.success('AUTH', 'User profile loaded', { email: usersData[0].email, role: usersData[0].role })
                    } else {
                        debug.warn('AUTH', 'No user profile found in users table', { userId: session.user.id })
                    }
                } else {
                    debug.log('AUTH', 'No active session found')
                }
            } catch (err: any) {
                console.error('Auth context init error:', err.message)
                debug.error('AUTH', 'Init error', { message: err.message })
            } finally {
                setLoading(false)
                debug.log('AUTH', 'Auth init complete')
            }
        }

        initAuth()

        // Listen for changes on auth state
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state change event:', event, 'user:', session?.user?.email)
            debug.log('AUTH', 'Auth state changed', { event, email: session?.user?.email, userId: session?.user?.id })

            if (session?.user) {
                setSupabaseUser(session.user)
                // Fetch user data from users table
                debug.log('AUTH', 'State change: fetching user profile...', { userId: session.user.id })
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
                    debug.success('AUTH', 'Profile loaded from state change', { email: usersData[0].email, role: usersData[0].role })
                } else {
                    // No profile in users table - keep user null and require proper setup
                    console.warn('User profile not found in users table')
                    debug.error('AUTH', '❌ NO USER PROFILE FOUND', {
                        reason: 'Auth user exists but no row in users table',
                        userId: session.user.id,
                        authEmail: session.user.email,
                        solution: 'Run user creation SQL or signup flow to create user profile'
                    })
                    setUser(null)
                    // Sign out to prevent broken state
                    await supabase.auth.signOut()
                    router.push('/login')
                }
            } else {
                debug.log('AUTH', 'Session cleared, setting user to null')
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
        debug.log('AUTH', 'Logout initiated', { currentUser: user?.email })
        setUser(null)
        setSupabaseUser(null)
        debug.log('AUTH', 'User state cleared')
        await supabase.auth.signOut()
        debug.success('AUTH', 'Supabase signOut complete')
        router.push("/")
        debug.log('AUTH', 'Redirecting to login...')
        router.refresh()
        debug.log('AUTH', 'Logout complete')
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
