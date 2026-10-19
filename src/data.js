// Content mirrors https://joselito.bio, in the order the page shows it.
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
      links: [{ key: "coffee", url: "https://buymeacoffee.com/joselito" }],
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
      titles: ["i make websites (and things)", "Twilio Champion"],
      pronouns: "he/him",
      location: "Recife, Brazil",
      about:
        "In the game since 2008: working remotely, building small tools, " +
        "and running my own services at home. I also empower the tech " +
        "communities around.",
      headings: { accounts: "Accounts", support: "Support", contact: "Contact" },
      labels: {
        linkedin: "LinkedIn",
        bluesky: "Bluesky",
        github: "GitHub",
        orcid: "ORCID",
        coffee: "Buy Me a Coffee",
        email: "Email",
        calendar: "Calendar",
        web: "Web",
      },
    },
    pt: {
      titles: ["i make websites (and things)", "Twilio Champion"],
      pronouns: "ele/dele",
      location: "Recife, Brasil",
      about:
        "In the game since 2008: working remotely, building small tools, " +
        "and running my own services at home. I also empower the tech " +
        "communities around.",
      headings: { accounts: "Contas", support: "Apoie", contact: "Contato" },
      labels: {
        linkedin: "LinkedIn",
        bluesky: "Bluesky",
        github: "GitHub",
        orcid: "ORCID",
        coffee: "Buy Me a Coffee",
        email: "E-mail",
        calendar: "Agenda",
        web: "Site",
      },
    },
  },
};
