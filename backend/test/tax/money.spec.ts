import {
  addVatToExclusive,
  decimalStringFromMinorUnits,
  divideBigIntWithRounding,
  extractVatFromInclusive,
  minorUnitsFromDecimalString,
  percentageOfMinor,
  serializeMoney,
  money,
} from "../../src/tax/domain/money/money";

describe("money & rounding primitives", () => {
  describe("minorUnitsFromDecimalString / decimalStringFromMinorUnits", () => {
    it("parses whole and fractional KES amounts to exact minor units", () => {
      expect(minorUnitsFromDecimalString("1500.00")).toBe(150000n);
      expect(minorUnitsFromDecimalString("100.00")).toBe(10000n);
      expect(minorUnitsFromDecimalString("100")).toBe(10000n);
      expect(minorUnitsFromDecimalString("0.05")).toBe(5n);
    });

    it("round-trips back to a 2dp decimal string", () => {
      expect(decimalStringFromMinorUnits(150000n)).toBe("1500.00");
      expect(decimalStringFromMinorUnits(5n)).toBe("0.05");
      expect(decimalStringFromMinorUnits(-1234n)).toBe("-12.34");
    });

    it("rejects malformed input rather than silently truncating", () => {
      expect(() => minorUnitsFromDecimalString("12.345")).toThrow();
      expect(() => minorUnitsFromDecimalString("abc")).toThrow();
    });
  });

  describe("divideBigIntWithRounding", () => {
    it("HALF_UP rounds .5 and above up, away from zero", () => {
      expect(divideBigIntWithRounding(5n, 2n, "HALF_UP")).toBe(3n); // 2.5 -> 3
      expect(divideBigIntWithRounding(4n, 2n, "HALF_UP")).toBe(2n); // exact
      expect(divideBigIntWithRounding(-5n, 2n, "HALF_UP")).toBe(-3n); // symmetric
    });

    it("DOWN truncates toward zero", () => {
      expect(divideBigIntWithRounding(9n, 2n, "DOWN")).toBe(4n);
      expect(divideBigIntWithRounding(-9n, 2n, "DOWN")).toBe(-4n);
    });

    it("throws on division by zero", () => {
      expect(() => divideBigIntWithRounding(1n, 0n, "HALF_UP")).toThrow();
    });
  });

  describe("percentageOfMinor (basis points)", () => {
    it("500 bps of 150000 minor units (5% of KES 1500.00) is exactly KES 75.00", () => {
      expect(percentageOfMinor(150000n, 500, "HALF_UP")).toBe(7500n);
    });

    it("1600 bps (16%) of an odd amount rounds HALF_UP", () => {
      // 1099 * 0.16 = 175.84 -> minor units 10990*1600/10000=1758.4 -> rounds to 1758
      expect(percentageOfMinor(10990n, 1600, "HALF_UP")).toBe(1758n);
    });
  });

  describe("VAT-inclusive extraction / VAT-exclusive addition", () => {
    it("extracts 16% VAT from a KES 100.00 inclusive amount exactly as the demo scenario expects", () => {
      const { netMinor, vatMinor } = extractVatFromInclusive(
        10000n,
        1600,
        "HALF_UP",
      );
      expect(netMinor).toBe(8621n); // 86.21
      expect(vatMinor).toBe(1379n); // 13.79
      expect(netMinor + vatMinor).toBe(10000n); // net + vat always reconstitutes gross exactly
    });

    it("extracts 16% VAT from a KES 75.00 inclusive commission exactly as the demo scenario expects", () => {
      const { netMinor, vatMinor } = extractVatFromInclusive(
        7500n,
        1600,
        "HALF_UP",
      );
      expect(netMinor).toBe(6466n); // 64.66
      expect(vatMinor).toBe(1034n); // 10.34
    });

    it("adds 16% VAT on top of a VAT-exclusive net amount", () => {
      const { grossMinor, vatMinor } = addVatToExclusive(
        10000n,
        1600,
        "HALF_UP",
      );
      expect(vatMinor).toBe(1600n); // 16.00
      expect(grossMinor).toBe(11600n); // 116.00
    });

    it("zero rate produces zero VAT and gross === net", () => {
      const { netMinor, vatMinor } = extractVatFromInclusive(
        10000n,
        0,
        "HALF_UP",
      );
      expect(vatMinor).toBe(0n);
      expect(netMinor).toBe(10000n);
    });
  });

  describe("serializeMoney", () => {
    it("produces a JSON-safe representation with a string minorUnits field", () => {
      const serialized = serializeMoney(money(150000n));
      expect(serialized).toEqual({
        currency: "KES",
        minorUnits: "150000",
        display: "1500.00",
      });
      expect(() => JSON.stringify(serialized)).not.toThrow();
    });
  });
});
