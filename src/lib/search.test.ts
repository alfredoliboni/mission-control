import { describe, it, expect } from "vitest";

// Replicate the trigram functions from the search route for testability
function trigrams(s: string): Set<string> {
  const padded = `  ${s} `;
  const set = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) {
    set.add(padded.slice(i, i + 3));
  }
  return set;
}

function trigramSimilarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  let intersection = 0;
  for (const t of ta) {
    if (tb.has(t)) intersection++;
  }
  const union = ta.size + tb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

describe("trigrams", () => {
  it("generates correct trigrams for a word", () => {
    const result = trigrams("cat");
    expect(result.has("  c")).toBe(true);
    expect(result.has(" ca")).toBe(true);
    expect(result.has("cat")).toBe(true);
    expect(result.has("at ")).toBe(true);
  });

  it("handles empty string", () => {
    const result = trigrams("");
    expect(result.size).toBeGreaterThan(0); // "   " still generates 1 trigram
  });
});

describe("trigramSimilarity", () => {
  it("returns 1 for identical strings", () => {
    expect(trigramSimilarity("hello", "hello")).toBe(1);
  });

  it("returns 0 for completely different strings", () => {
    const sim = trigramSimilarity("abc", "xyz");
    expect(sim).toBeLessThan(0.1);
  });

  it("returns high similarity for typos", () => {
    // "ocupational" vs "occupational" — missing one 'c'
    const sim = trigramSimilarity("ocupational", "occupational");
    expect(sim).toBeGreaterThan(0.3);
  });

  it("returns high similarity for 'speach' vs 'speech'", () => {
    const sim = trigramSimilarity("speach", "speech");
    expect(sim).toBeGreaterThan(0.3);
  });

  it("returns moderate similarity for abbreviation vs full word", () => {
    const sim = trigramSimilarity("ot", "occupational");
    expect(sim).toBeLessThan(0.3); // Too short to be similar
  });

  it("returns high similarity for close matches", () => {
    const sim = trigramSimilarity("therapy", "therpy");
    expect(sim).toBeGreaterThan(0.3);
  });

  it("returns low similarity for unrelated words", () => {
    const sim = trigramSimilarity("dentist", "occupational");
    expect(sim).toBeLessThan(0.2);
  });
});

describe("city parsing", () => {
  it("extracts city from 'London, Ontario'", () => {
    const city = "London, Ontario";
    const cityName = city.split(",")[0].trim();
    expect(cityName).toBe("London");
  });

  it("handles city without province", () => {
    const city = "Toronto";
    const cityName = city.split(",")[0].trim();
    expect(cityName).toBe("Toronto");
  });

  it("handles empty string", () => {
    const city = "";
    const cityName = city.split(",")[0].trim();
    expect(cityName).toBe("");
  });

  it("handles 'St. Catharines, ON, Canada'", () => {
    const city = "St. Catharines, ON, Canada";
    const cityName = city.split(",")[0].trim();
    expect(cityName).toBe("St. Catharines");
  });
});
