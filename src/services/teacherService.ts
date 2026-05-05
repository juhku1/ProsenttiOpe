import { GoogleGenAI } from "@google/genai";
import { Token, Task } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getTeacherHint(task: Task, currentTokens: Token[]): Promise<string> {
  const tokenString = currentTokens.map(t => {
    if (t.type === 'number') return t.value.toString();
    if (t.type === 'operator') return t.value;
    if (t.type === 'fraction') return `(${t.numerator}/${t.denominator})`;
    if (t.type === 'variable') return 'x';
    return '';
  }).join(' ');

  const prompt = `
Olet "Professori Prosentti", ystävällinen ja kannustava matematiikan opettaja. 
Autat oppilasta ymmärtämään prosenttiyhtälöitä.

Tehtävä: "${task.text}"
Tavoite (evaluoinnin kaava): ${task.solution}

Oppilaan tämänhetkinen lauseke: "${tokenString}"

Anna lyhyt, korkeintaan 2 lauseen mittainen vinkki suomeksi. 
Älä kerro suoraan vastausta, vaan ohjaa oppilasta oikeaan suuntaan pedagogisesti.
Jos lauseke on tyhjä, neuvo miten aloittaa.
Jos lauseke on melkein oikein, kannusta.
Puhu suoraan oppilaalle.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "Hups, nyt en keksinyt vinkkiä. Yritä vielä!";
  } catch (error) {
    console.error("Teacher hint error:", error);
    return "Nyt tuli pieni yhteyskatkos. Yritetäänpä uudestaan hetken kuluttua!";
  }
}
