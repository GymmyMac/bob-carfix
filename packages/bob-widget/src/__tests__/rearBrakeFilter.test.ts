/**
 * Rear Brake Filter — Baseline Unit Tests
 * 
 * Tests the pure utility functions that power the Disc/Drum toggle
 * on the Rear Brake Service package.
 */

import { describe, it, expect } from "vitest";
import {
  isRearBrakePackage,
  filterByBrakeType,
  recalcTierTotal,
} from "../utils/rearBrakeFilter";

// ── Test products ──────────────────────────────────────────────
const products = [
  { partslotName: "BRAKE PADS REAR", displayPrice: 65.0 },
  { partslotName: "BRAKE ROTORS REAR", displayPrice: 120.0 },
  { partslotName: "BRAKE SHOE REAR", displayPrice: 45.0 },
  { partslotName: "BRAKE DRUM REAR", displayPrice: 80.0 },
  { partslotName: "BRAKE FLUID DOT4", displayPrice: 15.0 },
];

// ── isRearBrakePackage ─────────────────────────────────────────
describe("isRearBrakePackage", () => {
  it("matches by id containing 'rear-brake'", () => {
    expect(isRearBrakePackage({ id: "rear-brake-service" })).toBe(true);
  });

  it("matches by title containing 'Rear Brake'", () => {
    expect(isRearBrakePackage({ title: "Rear Brake Service" })).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isRearBrakePackage({ title: "REAR BRAKE SERVICE" })).toBe(true);
  });

  it("returns false for front brake", () => {
    expect(isRearBrakePackage({ id: "front-brake-service", title: "Front Brake Service" })).toBe(false);
  });

  it("returns false for unrelated packages", () => {
    expect(isRearBrakePackage({ id: "oil-service", title: "Oil Service" })).toBe(false);
    expect(isRearBrakePackage({ id: "air-filter", title: "Air Filter Service" })).toBe(false);
  });

  it("handles missing id and title gracefully", () => {
    expect(isRearBrakePackage({})).toBe(false);
  });
});

// ── filterByBrakeType ──────────────────────────────────────────
describe("filterByBrakeType", () => {
  it("disc mode: removes SHOE and DRUM, keeps PAD and ROTOR", () => {
    const result = filterByBrakeType(products, "disc");
    const names = result.map((p) => p.partslotName);

    expect(names).toContain("BRAKE PADS REAR");
    expect(names).toContain("BRAKE ROTORS REAR");
    expect(names).not.toContain("BRAKE SHOE REAR");
    expect(names).not.toContain("BRAKE DRUM REAR");
  });

  it("drum mode: removes PAD and ROTOR, keeps SHOE and DRUM", () => {
    const result = filterByBrakeType(products, "drum");
    const names = result.map((p) => p.partslotName);

    expect(names).toContain("BRAKE SHOE REAR");
    expect(names).toContain("BRAKE DRUM REAR");
    expect(names).not.toContain("BRAKE PADS REAR");
    expect(names).not.toContain("BRAKE ROTORS REAR");
  });

  it("both modes keep neutral products (BRAKE FLUID)", () => {
    expect(filterByBrakeType(products, "disc").map((p) => p.partslotName)).toContain("BRAKE FLUID DOT4");
    expect(filterByBrakeType(products, "drum").map((p) => p.partslotName)).toContain("BRAKE FLUID DOT4");
  });

  it("returns empty array when given empty input", () => {
    expect(filterByBrakeType([], "disc")).toEqual([]);
    expect(filterByBrakeType([], "drum")).toEqual([]);
  });
});

// ── recalcTierTotal ────────────────────────────────────────────
describe("recalcTierTotal", () => {
  it("sums displayPrice of all products", () => {
    expect(recalcTierTotal(products)).toBe(325.0);
  });

  it("sums only disc-filtered products correctly", () => {
    const disc = filterByBrakeType(products, "disc");
    // PAD 65 + ROTOR 120 + FLUID 15 = 200
    expect(recalcTierTotal(disc)).toBe(200.0);
  });

  it("sums only drum-filtered products correctly", () => {
    const drum = filterByBrakeType(products, "drum");
    // SHOE 45 + DRUM 80 + FLUID 15 = 140
    expect(recalcTierTotal(drum)).toBe(140.0);
  });

  it("returns 0 for empty array", () => {
    expect(recalcTierTotal([])).toBe(0);
  });
});
