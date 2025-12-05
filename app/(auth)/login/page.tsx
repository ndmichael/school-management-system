'use client'

import { useState } from 'react'
import { useFormState } from 'react-dom'
import { loginAction } from './actions'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Input, PrimaryButton } from '@/components/shared'

type FormState = {
  success: boolean
  error: string
}

const initialState: FormState = {
  success: false,
  error: ''
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, initialState)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-xl">
        <h1 className="text-3xl font-bold text-center mb-6">Welcome Back</h1>

        {/* Error Message */}
        {state.error && (
          <p className="text-red-600 text-center mb-4 text-sm">{state.error}</p>
        )}

        {/* Form UI */}
        <form action={formAction} className="space-y-4">
          <Input
            type="email"
            name="email"
            label="Email"
            placeholder="user@example.com"
            icon={<Mail className="w-5 h-5 text-gray-400" />}
            required
          />

          <Input
            type={showPassword ? 'text' : 'password'}
            name="password"
            label="Password"
            placeholder="Enter password"
            icon={<Lock className="w-5 h-5 text-gray-400" />}
            trailingIcon={
              showPassword ? (
                <EyeOff
                  onClick={() => setShowPassword(false)}
                  className="w-5 h-5 cursor-pointer"
                />
              ) : (
                <Eye
                  onClick={() => setShowPassword(true)}
                  className="w-5 h-5 cursor-pointer"
                />
              )
            }
            required
          />

          <PrimaryButton type="submit" className="w-full">
            Sign In
          </PrimaryButton>
        </form>
      </div>
    </div>
  )
}
