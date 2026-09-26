export default function UserManagementPlaceholder() {
  return (
    <div className="space-y-6">
      <section className="brand-card rounded-2xl p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-[#0B1D3A]">User & PIC Management</h3>
            <p className="mt-1 text-sm text-slate-500">Foundation untuk Super Admin/Admin.</p>
          </div>
          <button className="rounded-xl bg-[#1565EF] px-4 py-3 text-sm font-semibold text-white">Tambah User</button>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-[#F5F9FF]">
              <tr>
                {["Nama","Email","Role","ID PIC","Branch","Stockpoint","Status","Aksi"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody><tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">Belum ada data.</td></tr></tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
