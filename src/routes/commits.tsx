import type { LoaderArgs } from "@remix-run/node"

export const loader = async ({ request }: LoaderArgs) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("path");
    console.log("jeg er thomas", query)
    return ":):)"
}