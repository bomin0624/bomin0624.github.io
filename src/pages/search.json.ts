import { getCollection } from "astro:content";
import { PAGES } from "../config";

export const prerender = true;

type SearchItem = {
    title: string;
    description: string;
    content: string;
    tags: string[];
    href: string;
    type: string;
};

const createItems = async (
    collection: "posts" | "publications" | "projects",
    type: string,
): Promise<SearchItem[]> => {
    const entries = await getCollection(collection);

    return entries.map((entry: any) => ({
        title: entry.data.title,
        description: entry.data.description || entry.data.journal || "",
        content: entry.body || "",
        tags: entry.data.tags || [],
        href: `/${collection}/${entry.id}`,
        type,
    }));
};

export async function GET() {
    const items = [
        ...(PAGES.blog.isActive !== false ? await createItems("posts", "Blog") : []),
        ...(PAGES.publications.isActive !== false
            ? await createItems("publications", "Publication")
            : []),
        ...(PAGES.projects.isActive !== false ? await createItems("projects", "Side Project") : []),
    ];

    return new Response(JSON.stringify(items), {
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
        },
    });
}
