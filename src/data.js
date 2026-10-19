// Content mirrors https://joselito.bio, in the order the page shows it.
// Support options follow the design system order: Pix, Buy Me a Coffee,
// GitHub Sponsors (as listed on https://pix.joseli.to).
export const pixKey = "apoie@pix.joseli.to";

export const card = {
  command: "npx joselito",
  wordmark: { base: "joseli", block: ".to" },
  name: "Joselito",
  pronunciation: "/ʒo.zeˈli.tu/",
  sections: [
    {
      key: "accounts",
      links: [
        { key: "linkedin", url: "https://www.linkedin.com/in/breakzplatform" },
        { key: "bluesky", url: "https://bsky.app/profile/joseli.to" },
        { key: "github", url: "https://github.com/breakzplatform" },
        { key: "orcid", url: "https://orcid.org/0009-0009-2564-0761" },
      ],
    },
    {
      key: "support",
      links: [
        { key: "pix", display: pixKey },
        { key: "coffee", url: "https://buymeacoffee.com/joselito" },
        { key: "sponsors", url: "https://github.com/sponsors/breakzplatform" },
      ],
    },
    {
      key: "contact",
      links: [
        { key: "email", url: "mailto:me@joseli.to", display: "me@joseli.to" },
        { key: "calendar", url: "https://cal.joseli.to/me" },
        { key: "web", url: "https://joselito.bio" },
      ],
    },
  ],
  locales: {
    en: {
      titles: ["i make websites (and things)"],
      pronouns: "he/him",
      location: "Recife, Brazil",
      about:
        "In the game since 2008: a webmaster working remotely, building " +
        "small tools, and running my own services at home. I also empower " +
        "the tech communities around me.",
      hint: "npx joselito --pix copies the Pix key",
      headings: { accounts: "Accounts", support: "Support", contact: "Contact" },
      labels: {
        linkedin: "LinkedIn",
        bluesky: "Bluesky",
        github: "GitHub",
        orcid: "ORCID",
        pix: "Pix",
        coffee: "Buy Me a Coffee",
        sponsors: "GitHub Sponsors",
        email: "Email",
        calendar: "Calendar",
        web: "Web",
      },
    },
    pt: {
      titles: ["i make websites (and things)"],
      pronouns: "ele/dele",
      location: "Recife, Brasil",
      about:
        "In the game since 2008: a webmaster working remotely, building " +
        "small tools, and running my own services at home. I also empower " +
        "the tech communities around me.",
      hint: "npx joselito --pix copia a chave Pix",
      headings: { accounts: "Contas", support: "Apoie", contact: "Contato" },
      labels: {
        linkedin: "LinkedIn",
        bluesky: "Bluesky",
        github: "GitHub",
        orcid: "ORCID",
        pix: "Pix",
        coffee: "Buy Me a Coffee",
        sponsors: "GitHub Sponsors",
        email: "E-mail",
        calendar: "Agenda",
        web: "Site",
      },
    },
  },
};
