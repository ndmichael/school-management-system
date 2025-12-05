'use client'

import { useFormState } from 'react-dom'
import { updateAdminProfileAction, type UpdateAdminState } from './actions'

const initialState: UpdateAdminState = {
  success: false,
  error: '',
}

export default function AdminDashboardPage() {
  const [state, formAction] = useFormState(updateAdminProfileAction, initialState)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      <section className="max-w-md p-4 border rounded-xl bg-white shadow-sm space-y-4">
        <h2 className="text-lg font-semibold">Update Admin Profile</h2>
        <p className="text-sm text-gray-600">
          This is just a test action using your current authenticated admin account.
        </p>

        <form action={formAction} className="space-y-3">
          <div>
            <label className="block text-sm mb-1" htmlFor="firstName">
              First name
            </label>
            <input
              id="firstName"
              name="firstName"
              defaultValue="John"
              className="w-full border rounded px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1" htmlFor="lastName">
              Last name
            </label>
            <input
              id="lastName"
              name="lastName"
              defaultValue="Doe"
              className="w-full border rounded px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1" htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              defaultValue="123-456-7890"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm mb-1" htmlFor="avatarUrl">
              Avatar URL
            </label>
            <input
              id="avatarUrl"
              name="avatarUrl"
              defaultValue="https://example.com/admin-avatar.jpg"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
          >
            Update Admin Profile
          </button>
        </form>

        {state.success && (
          <p className="text-sm text-green-600">
            Admin profile updated successfully.
          </p>
        )}
        {state.error && (
          <p className="text-sm text-red-600">
            {state.error}
          </p>
        )}
      </section>
    </div>
  )
}
