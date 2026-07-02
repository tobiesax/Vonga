import { getProducts } from "@/lib/repository";
import Storefront from "./storefront";

export const dynamic = "force-dynamic";
export default async function Home() { return <Storefront products={await getProducts()} />; }
