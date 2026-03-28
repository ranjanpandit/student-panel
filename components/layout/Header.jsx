"use client";

export default function Header({ student }) {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="h-14 bg-white border-b flex items-center justify-between px-6">
      <div className="font-semibold">Testolia Student</div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {student?.name}
        </span>

        <button
          onClick={logout}
          className="text-sm text-red-600 hover:underline"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
