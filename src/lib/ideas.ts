import { prisma } from "./prisma";

/**
 * Ideas & quick notes: the low-friction end of the recipe pipeline.
 *
 * A recipe is a lot of typing. An idea is one line, jotted while you think of
 * it, and promoted into a real recipe when there's time. Household-scoped like
 * everything else, so either partner can add to the same pile.
 */

export interface IdeaDTO {
  id: string;
  text: string;
  url: string | null;
  done: boolean;
  convertedRecipeId: string | null;
  /** Display name (or email) of whoever jotted it; null if they've left. */
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface IdeaRow {
  id: string;
  text: string;
  url: string | null;
  done: boolean;
  convertedRecipeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { user: { name: string | null; email: string } } | null;
}

// Fields are picked one by one rather than spread: callers pass whole Prisma
// rows, and a spread would quietly leak householdId/createdByMembershipId into
// the API without tsc noticing.
function mapIdea(i: IdeaRow): IdeaDTO {
  return {
    id: i.id,
    text: i.text,
    url: i.url,
    done: i.done,
    convertedRecipeId: i.convertedRecipeId,
    createdByName: i.createdBy
      ? (i.createdBy.user.name ?? i.createdBy.user.email)
      : null,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

const includeAuthor = {
  createdBy: { select: { user: { select: { name: true, email: true } } } },
} as const;

/** First http(s) link in a jotted note, so "paste a link" needs no extra field. */
export function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"]+/i);
  if (!match) return null;
  // Trailing punctuation is far more likely sentence than URL.
  return match[0].replace(/[.,;:!?)\]]+$/, "");
}

export async function listIdeas(householdId: string): Promise<IdeaDTO[]> {
  const ideas = await prisma.idea.findMany({
    where: { householdId },
    include: includeAuthor,
    orderBy: [{ done: "asc" }, { createdAt: "desc" }],
  });
  return ideas.map(mapIdea);
}

export interface IdeaInput {
  text: string;
  url?: string | null;
}

export async function createIdea(
  householdId: string,
  membershipId: string | null,
  input: IdeaInput,
): Promise<IdeaDTO> {
  const text = input.text.trim();
  const idea = await prisma.idea.create({
    data: {
      householdId,
      text,
      url: input.url ?? extractUrl(text),
      createdByMembershipId: membershipId,
    },
    include: includeAuthor,
  });
  return mapIdea(idea);
}

export interface UpdateIdeaInput {
  text?: string;
  url?: string | null;
  done?: boolean;
  convertedRecipeId?: string | null;
}

export async function updateIdea(
  householdId: string,
  ideaId: string,
  patch: UpdateIdeaInput,
): Promise<IdeaDTO> {
  const existing = await prisma.idea.findFirst({
    where: { id: ideaId, householdId },
    select: { id: true },
  });
  if (!existing) throw new Error("not_found");

  // Linking to a recipe is an id the client supplies — check it's one of ours
  // before trusting it, or an idea could be pointed at another household's row.
  if (patch.convertedRecipeId) {
    const recipe = await prisma.recipe.findFirst({
      where: { id: patch.convertedRecipeId, householdId },
      select: { id: true },
    });
    if (!recipe) throw new Error("recipe_not_found");
  }

  const text = patch.text?.trim();
  const idea = await prisma.idea.update({
    where: { id: ideaId },
    data: {
      text,
      // Re-jotting the text re-derives the link, unless one was passed.
      url:
        patch.url !== undefined
          ? patch.url
          : text !== undefined
            ? extractUrl(text)
            : undefined,
      done: patch.done,
      convertedRecipeId: patch.convertedRecipeId,
    },
    include: includeAuthor,
  });
  return mapIdea(idea);
}

export async function deleteIdea(
  householdId: string,
  ideaId: string,
): Promise<boolean> {
  const { count } = await prisma.idea.deleteMany({
    where: { id: ideaId, householdId },
  });
  return count > 0;
}

/** Count of open (not done) ideas, for the dashboard tile. */
export async function countOpenIdeas(householdId: string): Promise<number> {
  return prisma.idea.count({ where: { householdId, done: false } });
}
