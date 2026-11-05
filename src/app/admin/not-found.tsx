import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="rounded-md border border-line bg-white p-8 text-center">
      <h1 className="mb-2 text-[22px] font-bold">Not found</h1>
      <p className="mb-5 text-[15px]">This item does not exist (it may have been deleted), or you do not have access to it.</p>
      <Link href="/admin/" className="btn btn-primary">
        Back to the dashboard
      </Link>
    </div>
  );
}
