import type { SocialLink } from "../types";

export const SOCIALS: SocialLink[] = [
    {
        name: "Github",
        href: "https://github.com/bomin0624",
        linkTitle: `GitHub`,
        isActive: true,
    },
    {
        name: "Mail",
        href: "mailto:appppm31012@gmail.com",
        linkTitle: `Email`,
        isActive: true,
    },
    {
        name: "Google Scholar",
        href: "https://scholar.google.com/citations?user=3nqb5NcAAAAJ&hl",
        linkTitle: `Google Scholar`,
        isActive: true,
    },
    {
        name: "ORCID",
        href: "https://orcid.org/0009-0005-1075-0969",
        linkTitle: `ORCID`,
        isActive: true,
    },
    {
        name: "LinkedIn",
        href: "https://www.linkedin.com/in/bomin0624/",
        linkTitle: `LinkedIn`,
        isActive: true,
    },
    {
        name: "X",
        href: "https://x.com/bomin0624_c",
        linkTitle: `X`,
        isActive: true,
    },
];

export const SOCIAL_ICONS: Record<string, string> = {
    Github: "Github",
    Mail: "Mail",
    Linkedin: "LinkedIn",
    "Google Scholar": "GoogleScholar",
    ORCID: "ORCID",
    X: "Twitter",
    RSS: "RSS",
};
