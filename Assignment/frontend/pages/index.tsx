import Router from "next/router";

export default function Home() {
  return (
    <div
      style={{ padding: 40, cursor: "pointer" }}
      onClick={() => Router.push("/dashboard/today")}
    >
      Go to Dashboard →
    </div>
  );
}
