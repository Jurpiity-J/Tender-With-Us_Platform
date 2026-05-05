'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function getField(formData: FormData, key: string) {
  const value = formData.get(key)

  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`)
}

const allowedPublicRoles = ['sponsor', 'bidder', 'public_user'] as const

type PublicRole = (typeof allowedPublicRoles)[number]

function isAllowedPublicRole(role: string): role is PublicRole {
  return allowedPublicRoles.includes(role as PublicRole)
}

export async function registerAction(formData: FormData) {
  const supabase = await createClient()

  const email = getField(formData, 'email').toLowerCase()
  const password = getField(formData, 'password')
  const fullName = getField(formData, 'fullName')
  const role = getField(formData, 'role')
  const companyName = getField(formData, 'companyName')
  const registrationNumber = getField(formData, 'registrationNumber')
  const taxNumber = getField(formData, 'taxNumber')

  if (!email || !password || !fullName || !role) {
    redirectWithError('/register', 'Please fill in all required fields.')
  }

  if (!isAllowedPublicRole(role)) {
    redirectWithError('/register', 'Invalid role selected.')
  }

  if (role !== 'public_user' && !companyName) {
    redirectWithError('/register', 'Company name is required for sponsors and bidders.')
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
  email,
  password,
})

if (signUpError || !signUpData.user) {
  redirectWithError('/register', signUpError?.message ?? 'Could not create account.')
}

const { error: signInError } = await supabase.auth.signInWithPassword({
  email,
  password,
})

if (signInError) {
  redirectWithError(
    '/login',
    'Account created, but you need to log in before your profile can be completed.'
  )
}

const { error: registrationError } = await supabase.rpc(
  'complete_user_registration',
  {
    p_full_name: fullName,
    p_role: role,
    p_company_name: companyName || null,
    p_registration_number: registrationNumber || null,
    p_tax_number: taxNumber || null,
  }
)

if (registrationError) {
  redirectWithError('/register', registrationError.message)
}

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function loginAction(formData: FormData) {
  const supabase = await createClient()

  const email = getField(formData, 'email').toLowerCase()
  const password = getField(formData, 'password')

  if (!email || !password) {
    redirectWithError('/login', 'Please enter your email and password.')
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirectWithError('/login', error.message)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logoutAction() {
  const supabase = await createClient()

  await supabase.auth.signOut()

  revalidatePath('/', 'layout')
  redirect('/login')
}