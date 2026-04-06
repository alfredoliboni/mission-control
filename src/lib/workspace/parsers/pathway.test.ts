import { parsePathway } from "./pathway";
import { loadDemoData } from "./__fixtures__/load-demo-data";

describe("parsePathway", () => {
  describe("with demo data", () => {
    const md = loadDemoData("pathway.md");
    const result = parsePathway(md);

    it("extracts current stage", () => {
      expect(result.currentStage).toBe("seeking-services");
    });

    it("parses all 5 stages", () => {
      expect(result.stages).toHaveLength(5);
    });

    it("assigns correct stage numbers and titles", () => {
      expect(result.stages[0].number).toBe(1);
      expect(result.stages[0].title).toBe("Initial Concerns");
      expect(result.stages[1].number).toBe(2);
      expect(result.stages[1].title).toBe("Assessment & Diagnosis");
      expect(result.stages[2].number).toBe(3);
      expect(result.stages[2].title).toBe("Seeking Services");
      expect(result.stages[3].number).toBe(4);
      expect(result.stages[3].title).toBe("In Therapy");
      expect(result.stages[4].number).toBe(5);
      expect(result.stages[4].title).toBe("Stable Support");
    });

    it("parses completed stage status", () => {
      expect(result.stages[0].status).toBe("completed");
      expect(result.stages[1].status).toBe("completed");
    });

    it("parses current stage status", () => {
      expect(result.stages[2].status).toBe("current");
    });

    it("parses upcoming stage status", () => {
      expect(result.stages[3].status).toBe("upcoming");
      expect(result.stages[4].status).toBe("upcoming");
    });

    it("parses completed checkbox items", () => {
      const stage1 = result.stages[0];
      expect(stage1.items).toHaveLength(3);
      for (const item of stage1.items) {
        expect(item.completed).toBe(true);
        expect(item.status).toBe("completed");
      }
    });

    it("extracts dates from completed items", () => {
      const stage1 = result.stages[0];
      expect(stage1.items[0].date).toBe("2024-06");
      expect(stage1.items[1].date).toBe("2024-09-15");
      expect(stage1.items[2].date).toBe("2024-10-01");
    });

    it("cleans date suffix from item text", () => {
      const stage1 = result.stages[0];
      expect(stage1.items[0].text).toBe("Noticed developmental differences");
      expect(stage1.items[1].text).toBe("Spoke with pediatrician");
    });

    it("parses milestone items (checked milestones resolve to completed)", () => {
      const stage2 = result.stages[1];
      // The milestone item is checked [x], so parseItemStatus returns
      // "completed" (completed takes priority over milestone detection)
      const milestoneText = stage2.items.find((i) =>
        i.text.includes("MILESTONE")
      );
      expect(milestoneText).toBeDefined();
      expect(milestoneText!.completed).toBe(true);
      expect(milestoneText!.status).toBe("completed");
    });

    it("parses unchecked milestone items as milestone status", () => {
      const md = `## Stages
### 1. Test [current]
- [ ] ⭐ MILESTONE: Something important`;
      const r = parsePathway(md);
      const milestone = r.stages[0].items[0];
      expect(milestone.status).toBe("milestone");
      expect(milestone.completed).toBe(false);
      expect(milestone.text).toBe("MILESTONE: Something important");
    });

    it("parses current (blue circle) items", () => {
      const stage3 = result.stages[2];
      const currentItems = stage3.items.filter(
        (i) => i.status === "current"
      );
      expect(currentItems.length).toBeGreaterThanOrEqual(2);
      expect(currentItems[0].completed).toBe(false);
    });

    it("cleans emoji prefixes from item text", () => {
      const stage3 = result.stages[2];
      const blueItem = stage3.items.find(
        (i) => i.status === "current"
      );
      expect(blueItem).toBeDefined();
      expect(blueItem!.text).not.toContain("🔵");
    });

    it("parses blocked items", () => {
      const stage3 = result.stages[2];
      const blocked = stage3.items.find(
        (i) => i.status === "blocked"
      );
      expect(blocked).toBeDefined();
      expect(blocked!.text).toContain("BLOCKED");
      expect(blocked!.completed).toBe(false);
    });

    it("parses upcoming (unchecked, no emoji) items", () => {
      const stage3 = result.stages[2];
      const upcoming = stage3.items.filter(
        (i) => i.status === "upcoming"
      );
      expect(upcoming.length).toBeGreaterThanOrEqual(2);
      for (const item of upcoming) {
        expect(item.completed).toBe(false);
      }
    });

    it("parses upcoming stage items without dates", () => {
      const stage4 = result.stages[3];
      expect(stage4.items).toHaveLength(4);
      for (const item of stage4.items) {
        expect(item.date).toBeUndefined();
        expect(item.completed).toBe(false);
      }
    });

    it("parses next actions as numbered list", () => {
      expect(result.nextActions).toHaveLength(4);
      expect(result.nextActions[0]).toContain("Follow up on OAP");
      expect(result.nextActions[1]).toContain("Call Pathways");
      expect(result.nextActions[2]).toContain("Research gap filler");
      expect(result.nextActions[3]).toContain("Submit DTC application");
    });
  });

  describe("edge cases", () => {
    it("returns safe defaults for empty string", () => {
      const result = parsePathway("");
      expect(result.currentStage).toBe("");
      expect(result.stages).toEqual([]);
      expect(result.nextActions).toEqual([]);
    });

    it("handles stages with no items", () => {
      const md = `## Current Stage: test
## Stages
### 1. Empty Stage [current]
## Next Actions`;
      const result = parsePathway(md);
      expect(result.stages).toHaveLength(1);
      expect(result.stages[0].title).toBe("Empty Stage");
      expect(result.stages[0].status).toBe("current");
      expect(result.stages[0].items).toEqual([]);
    });

    it("parses markdown with no next actions", () => {
      const md = `## Current Stage: test
## Stages
### 1. Some Stage [completed]
- [x] Done item`;
      const result = parsePathway(md);
      expect(result.stages).toHaveLength(1);
      expect(result.nextActions).toEqual([]);
    });

    it("handles missing current stage line", () => {
      const md = `## Stages
### 1. Only Stage [upcoming]
- [ ] Something`;
      const result = parsePathway(md);
      expect(result.currentStage).toBe("");
      expect(result.stages).toHaveLength(1);
    });
  });
});
