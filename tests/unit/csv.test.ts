/** The small CSV parser inside scripts/import-woocommerce.ts (the import itself only runs from the command line). */
import { describe, expect, it } from "vitest";
import { parseCsv } from "../../scripts/import-woocommerce";

describe("parseCsv", () => {
  it("splits simple rows", () => {
    expect(parseCsv("a,b,c\n1,2,3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quotes, commas, escaped quotes and new lines inside fields", () => {
    const csv = 'name,address,note\r\n"Kumar ""RK""","Flat 12, Sample Apts","line 1\nline 2"\r\n';
    expect(parseCsv(csv)).toEqual([
      ["name", "address", "note"],
      ['Kumar "RK"', "Flat 12, Sample Apts", "line 1\nline 2"],
    ]);
  });

  it("keeps empty fields, skips empty lines, strips the BOM and reads a last line without new line", () => {
    expect(parseCsv("﻿a,b,c\n\n1,,3\n,,\nx,y,z")).toEqual([
      ["a", "b", "c"],
      ["1", "", "3"],
      ["", "", ""],
      ["x", "y", "z"],
    ]);
  });

  it("keeps Unicode (₹, Hindi) as is", () => {
    expect(parseCsv("text\n₹200 छूट\n")).toEqual([["text"], ["₹200 छूट"]]);
  });

  it("refuses a file that ends inside quotes", () => {
    expect(() => parseCsv('a,b\n"open,1\n')).toThrow(/quoted field/);
  });
});
