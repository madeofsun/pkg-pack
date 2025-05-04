import { test, describe, expect } from "vitest";
import { editJson } from "../json";

describe("editJson", () => {
  describe("common errors", () => {
    test("throws on unknown operation", () => {
      expect(() =>
        editJson(`[]`, [
          {
            // @ts-ignore
            kind: "qwe",
            path: [],
          },
        ])
      ).toThrow("Unknown op");
    });

    test("throws on unknown property syntax", () => {
      expect(() =>
        editJson(`{ a: 1 }`, [
          {
            // @ts-ignore
            kind: "qwe",
            path: [],
          },
        ])
      ).toThrow("Unexpected property syntax");

      expect(() =>
        editJson(`{ ['a']: 1 }`, [
          {
            // @ts-ignore
            kind: "qwe",
            path: [],
          },
        ])
      ).toThrow("Unexpected property syntax");
    });

    test("throws on unknown syntax", () => {
      expect(() =>
        editJson(`{ "a": 1n }`, [
          {
            // @ts-ignore
            kind: "qwe",
            path: [],
          },
        ])
      ).toThrow("Unexpected syntax");
    });

    test("path not found", () => {
      expect(() =>
        editJson(`{ "a": 1 }`, [
          {
            kind: "set",
            path: ["b"],
            value: 2,
          },
        ])
      ).toThrow('Path "b" is not found');

      expect(() =>
        editJson(`[0]`, [
          {
            kind: "set",
            path: [1],
            value: 2,
          },
        ])
      ).toThrow('Path "1" is not found');

      expect(() =>
        editJson(`{ "a": 1 }`, [
          {
            kind: "set",
            path: ["a", 1],
            value: 2,
          },
        ])
      ).toThrow('Path "a.1" is not found');
    });
  });

  describe("set", () => {
    describe("top-level", () => {
      test.each([
        ['"a"'],
        ["1"],
        ["true"],
        ["false"],
        ["null"],
        ["{}"],
        ["[]"],
      ] as const)("%s", (source) => {
        const res = editJson(source, [
          {
            kind: "set",
            path: [],
            value: { a: 1, b: "2" },
          },
        ]);
        expect(res).toBe(`{
  "a": 1,
  "b": "2"
}`);
      });
    });

    describe("in object", () => {
      test.each([
        [
          null,
          `{
  "a": null
}`,
        ],
        [
          true,
          `{
  "a": true
}`,
        ],
        [
          false,
          `{
  "a": false
}`,
        ],
        [
          1,
          `{
  "a": 1
}`,
        ],
        [
          "a",
          `{
  "a": "a"
}`,
        ],
        [
          { a: 1 },
          `{
  "a": {
    "a": 1
  }
}`,
        ],
        [
          ["a", 1],
          `{
  "a": [
    "a",
    1
  ]
}`,
        ],
      ] as const)("%s", (value, expected) => {
        const source = `{
  "a": {}
}`;
        const res = editJson(source, [
          {
            kind: "set",
            path: ["a"],
            value,
          },
        ]);
        expect(res).toBe(expected);
      });
    });

    describe("in array", () => {
      test.each([
        [null, `[1,null]`],
        [true, `[1,true]`],
        [false, `[1,false]`],
        [1, `[1,1]`],
        ["a", `[1,"a"]`],
        [
          { a: 1 },
          `[1,{
  "a": 1
}]`,
        ],
        [
          ["a", 1],
          `[1,[
  "a",
  1
]]`,
        ],
      ] as const)("%s", (value, expected) => {
        const source = `[1,2]`;
        const res = editJson(source, [
          {
            kind: "set",
            path: [1],
            value,
          },
        ]);
        expect(res).toBe(expected);
      });
    });
  });

  describe("arrayRemove", () => {
    const kind = "arrayRemove";

    test("not array", () => {
      expect(() =>
        editJson(`{ "a": 1 }`, [
          {
            kind,
            path: ["a"],
            index: 0,
          },
        ])
      ).toThrow(`Operation "${kind}" cannot be applied to "primitive" ("a")`);
    });

    test("index not found", () => {
      expect(() =>
        editJson(`[0]`, [
          {
            kind,
            path: [],
            index: 1,
          },
        ])
      ).toThrow(`Array at "" does not have element at index "1"`);
    });

    describe("to zero", () => {
      test.each([
        ["inline", "[1]", "[]"],
        [
          "not-inline",
          `[
    1
  ]`,
          `[]`,
        ],
      ] as const)("%s", (_, source, expected) => {
        const res = editJson(source, [
          {
            kind,
            path: [],
            index: 0,
          },
        ]);
        expect(res).toBe(expected);
      });
    });

    describe("first", () => {
      test.each([
        ["inline", "[0, 1]", "[1]"],
        [
          "not-inline",
          `[
    0,
    1
  ]`,
          `[
    1
  ]`,
        ],
      ] as const)("%s", (_, source, expected) => {
        const res = editJson(source, [
          {
            kind,
            path: [],
            index: 0,
          },
        ]);
        expect(res).toBe(expected);
      });
    });

    describe("middle", () => {
      test.each([
        ["inline", "[ 0,  1,2]", "[ 0,2]"],
        [
          "not-inline",
          `[
    0,
      1,
    2
  ]`,
          `[
    0,
    2
  ]`,
        ],
      ] as const)("%s", (_, source, expected) => {
        const res = editJson(source, [
          {
            kind,
            path: [],
            index: 1,
          },
        ]);
        expect(res).toBe(expected);
      });
    });

    describe("last", () => {
      test.each([
        ["inline", "[ 0,1,  2]", "[ 0,1]"],
        [
          "not-inline",
          `[
    0,
      1,
    2
  ]`,
          `[
    0,
      1
  ]`,
        ],
      ] as const)("%s", (_, source, expected) => {
        const res = editJson(source, [
          {
            kind,
            path: [],
            index: 2,
          },
        ]);
        expect(res).toBe(expected);
      });
    });
  });

  describe("arrayPrepend", () => {
    const kind = "arrayPrepend";

    test("not array", () => {
      expect(() =>
        editJson(`{ "a": 1 }`, [
          {
            kind,
            path: ["a"],
            value: [1],
          },
        ])
      ).toThrow(`Operation "${kind}" cannot be applied to "primitive" ("a")`);
    });

    describe("zero", () => {
      test.each([
        ["inline", "[1]", "[1]"],
        [
          "not-inline",
          `[
    1
  ]`,
          `[
    1
  ]`,
        ],
      ] as const)("%s", (_, source, expected) => {
        const res = editJson(source, [
          {
            kind,
            path: [],
            value: [],
          },
        ]);
        expect(res).toBe(expected);
      });
    });

    describe("single", () => {
      test.each([
        [
          "empty",
          "[]",
          `[
  0
]`,
        ],
        ["inline", "[1, 2]", "[0, 1, 2]"],
        [
          "not-inline",
          `[
    1,
  2
]`,
          `[
    0,
    1,
  2
]`,
        ],
      ] as const)("%s", (_, source, expected) => {
        const res = editJson(source, [
          {
            kind,
            path: [],
            value: [0],
          },
        ]);
        expect(res).toBe(expected);
      });
    });

    describe("multiple", () => {
      test.each([
        ["empty", "[]", "[\n  0,\n  1\n]"],
        ["inline", "[2,3]", "[0, 1, 2,3]"],
        [
          "not-inline",
          `[
  2,
    3
  ]`,
          `[
  0,
  1,
  2,
    3
  ]`,
        ],
      ] as const)("%s", (_, source, expected) => {
        const res = editJson(source, [
          {
            kind,
            path: [],
            value: [0, 1],
          },
        ]);
        expect(res).toBe(expected);
      });
    });

    describe("with index", () => {
      test("index not found", () => {
        expect(() =>
          editJson(`[0]`, [
            {
              kind,
              path: [],
              beforeIndex: 1,
              value: [1],
            },
          ])
        ).toThrow(`Array at "" does not have element at index "1"`);
      });

      describe("first", () => {
        test.each([
          ["inline", "[1, 2]", "[0, 1, 2]"],
          [
            "not-inline",
            `[
      1,
        2
    ]`,
            `[
      0,
      1,
        2
    ]`,
          ],
        ] as const)("%s", (_, source, expected) => {
          const res = editJson(source, [
            {
              kind,
              path: [],
              value: [0],
              beforeIndex: 0,
            },
          ]);
          expect(res).toBe(expected);
        });
      });

      describe("rest", () => {
        test.each([
          ["inline", "[0, 2]", "[0, 1, 2]"],
          [
            "not-inline",
            `[
      0,
        2
    ]`,
            `[
      0,
        1,
      2
    ]`,
          ],
        ] as const)("%s", (_, source, expected) => {
          const res = editJson(source, [
            {
              kind,
              path: [],
              value: [1],
              beforeIndex: 1,
            },
          ]);
          expect(res).toBe(expected);
        });
      });
    });
  });

  describe("arrayAppend", () => {
    const kind = "arrayAppend";

    test("not array", () => {
      expect(() =>
        editJson(`{ "a": 1 }`, [
          {
            kind,
            path: ["a"],
            value: [1],
          },
        ])
      ).toThrow(`Operation "${kind}" cannot be applied to "primitive" ("a")`);
    });

    describe("zero", () => {
      test.each([
        ["inline", "[1]", "[1]"],
        [
          "not-inline",
          `[
    1
  ]`,
          `[
    1
  ]`,
        ],
      ] as const)("%s", (_, source, expected) => {
        const res = editJson(source, [
          {
            kind,
            path: [],
            value: [],
          },
        ]);
        expect(res).toBe(expected);
      });
    });

    describe("single", () => {
      test.each([
        ["empty", "[]", "[\n  2\n]"],
        ["inline", "[1]", "[1, 2]"],
        [
          "not-inline",
          `[
    1
  ]`,
          `[
    1,
    2
  ]`,
        ],
      ] as const)("%s", (_, source, expected) => {
        const res = editJson(source, [
          {
            kind,
            path: [],
            value: [2],
          },
        ]);
        expect(res).toBe(expected);
      });
    });

    describe("multiple", () => {
      test.each([
        ["empty", "[]", "[\n  2,\n  3\n]"],
        ["inline", "[1]", "[1, 2, 3]"],
        [
          "not-inline",
          `[
    1
  ]`,
          `[
    1,
    2,
    3
  ]`,
        ],
      ] as const)("%s", (_, source, expected) => {
        const res = editJson(source, [
          {
            kind,
            path: [],
            value: [2, 3],
          },
        ]);
        expect(res).toBe(expected);
      });
    });

    describe("with index", () => {
      test("index not found", () => {
        expect(() =>
          editJson(`[0]`, [
            {
              kind,
              path: [],
              afterIndex: 1,
              value: [1],
            },
          ])
        ).toThrow(`Array at "" does not have element at index "1"`);
      });

      describe("last", () => {
        test.each([
          ["inline", "[0, 1]", "[0, 1, 2]"],
          [
            "not-inline",
            `[
      0,
        1
    ]`,
            `[
      0,
        1,
      2
    ]`,
          ],
        ] as const)("%s", (_, source, expected) => {
          const res = editJson(source, [
            {
              kind,
              path: [],
              value: [2],
              afterIndex: 1,
            },
          ]);
          expect(res).toBe(expected);
        });
      });

      describe("rest", () => {
        test.each([
          ["inline", "[0, 2]", "[0, 1, 2]"],
          [
            "not-inline",
            `[
      0,
        2
    ]`,
            `[
      0,
      1,
        2
    ]`,
          ],
        ] as const)("%s", (_, source, expected) => {
          const res = editJson(source, [
            {
              kind,
              path: [],
              value: [1],
              afterIndex: 0,
            },
          ]);
          expect(res).toBe(expected);
        });
      });
    });
  });

  describe("objectRemove", () => {
    const kind = "objectRemove";

    test("not object", () => {
      expect(() =>
        editJson(`{ "a": 1 }`, [
          {
            kind,
            path: ["a"],
            prop: "a",
          },
        ])
      ).toThrow(`Operation "${kind}" cannot be applied to "primitive" ("a")`);
    });

    test("property not found", () => {
      expect(() =>
        editJson(`{"a": 1}`, [
          {
            kind,
            path: [],
            prop: "b",
          },
        ])
      ).toThrow(`Object at "" does not have property "b"`);
    });

    describe("to zero", () => {
      test.each([
        ["inline", '{"a":1}', "{}"],
        [
          "not-inline",
          `{
    "a": 1
  }`,
          `{}`,
        ],
      ] as const)("%s", (_, source, expected) => {
        const res = editJson(source, [
          {
            kind,
            path: [],
            prop: "a",
          },
        ]);
        expect(res).toBe(expected);
      });
    });

    describe("first", () => {
      test.each([
        ["inline", '{"a":1,"b":2,"c":3}', '{"b":2,"c":3}'],
        [
          "not-inline",
          `{
    "a": 1,
      "b": 2,
    "c": 3,
  }`,
          `{
    "b": 2,
    "c": 3,
  }`,
        ],
      ] as const)("%s", (_, source, expected) => {
        const res = editJson(source, [
          {
            kind,
            path: [],
            prop: "a",
          },
        ]);
        expect(res).toBe(expected);
      });
    });

    describe("middle", () => {
      test.each([
        ["inline", '{"a":1,"b":2,"c":3}', '{"a":1,"c":3}'],
        [
          "not-inline",
          `{
      "a": 1,
    "b": 2,
    "c": 3,
  }`,
          `{
      "a": 1,
    "c": 3,
  }`,
        ],
      ] as const)("%s", (_, source, expected) => {
        const res = editJson(source, [
          {
            kind,
            path: [],
            prop: "b",
          },
        ]);
        expect(res).toBe(expected);
      });
    });

    describe("last", () => {
      test.each([
        ["inline", '{"a":1,"b":2,"c":3}', '{"a":1,"b":2}'],
        [
          "not-inline",
          `{
      "a": 1,
    "b": 2,
      "c": 3
  }`,
          `{
      "a": 1,
    "b": 2
  }`,
        ],
      ] as const)("%s", (_, source, expected) => {
        const res = editJson(source, [
          {
            kind,
            path: [],
            prop: "c",
          },
        ]);
        expect(res).toBe(expected);
      });
    });
  });

  describe("objectPrepend", () => {
    const kind = "objectPrepend";

    test("not object", () => {
      expect(() =>
        editJson(`{ "a": 1 }`, [
          {
            kind,
            path: ["a"],
            value: { b: 2 },
          },
        ])
      ).toThrow(`Operation "${kind}" cannot be applied to "primitive" ("a")`);
    });

    describe("zero", () => {
      test.each([
        ["inline", '{"a": 1}', '{"a": 1}'],
        [
          "not-inline",
          `{
    "a": 1
  }`,
          `{
    "a": 1
  }`,
        ],
      ] as const)("%s", (_, source, expected) => {
        const res = editJson(source, [
          {
            kind,
            path: [],
            value: {},
          },
        ]);
        expect(res).toBe(expected);
      });
    });

    describe("single", () => {
      test.each([
        ["empty", "{}", '{\n  "b": "2"\n}'],
        ["inline", '{"a": 1}', '{"b": "2", "a": 1}'],
        [
          "not-inline",
          `{
    "a": 1
  }`,
          `{
    "b": "2",
    "a": 1
  }`,
        ],
      ] as const)("%s", (_, source, expected) => {
        const res = editJson(source, [
          {
            kind,
            path: [],
            value: {
              b: "2",
            },
          },
        ]);
        expect(res).toBe(expected);
      });
    });

    describe("multiple", () => {
      test.each([
        ["empty", "{}", '{\n  "b": "2",\n  "c": 3\n}'],
        ["inline", '{"a": 1}', '{"b": "2", "c": 3, "a": 1}'],
        [
          "not-inline",
          `{
    "a": 1
  }`,
          `{
    "b": "2",
    "c": 3,
    "a": 1
  }`,
        ],
      ] as const)("%s", (_, source, expected) => {
        const res = editJson(source, [
          {
            kind,
            path: [],
            value: {
              b: "2",
              c: 3,
            },
          },
        ]);
        expect(res).toBe(expected);
      });
    });

    describe("with property", () => {
      test("property not found", () => {
        expect(() =>
          editJson(`{"a": 1}`, [
            {
              kind,
              path: [],
              beforeProp: "b",
              value: { c: 3 },
            },
          ])
        ).toThrow(`Object at "" does not have property "b"`);
      });

      describe("first", () => {
        test.each([
          ["inline", '{"b": 2, "c": 3}', '{"a": 1, "b": 2, "c": 3}'],
          [
            "not-inline",
            `{
        "b": 2,
      "c": 3
    }`,
            `{
        "a": 1,
        "b": 2,
      "c": 3
    }`,
          ],
        ] as const)("%s", (_, source, expected) => {
          const res = editJson(source, [
            {
              kind,
              path: [],
              value: { a: 1 },
              beforeProp: "b",
            },
          ]);
          expect(res).toBe(expected);
        });
      });

      describe("rest", () => {
        test.each([
          ["inline", '{"a": 1, "c": 3}', '{"a": 1, "b": 2, "c": 3}'],
          [
            "not-inline",
            `{
        "a": 1,
      "c": 3
    }`,
            `{
        "a": 1,
      "b": 2,
        "c": 3
    }`,
          ],
        ] as const)("%s", (_, source, expected) => {
          const res = editJson(source, [
            {
              kind,
              path: [],
              value: { b: 2 },
              beforeProp: "c",
            },
          ]);
          expect(res).toBe(expected);
        });
      });
    });
  });

  describe("objectAppend", () => {
    const kind = "objectAppend";

    test("not object", () => {
      expect(() =>
        editJson(`{ "a": 1 }`, [
          {
            kind,
            path: ["a"],
            value: { b: 2 },
          },
        ])
      ).toThrow(`Operation "${kind}" cannot be applied to "primitive" ("a")`);
    });

    describe("zero", () => {
      test.each([
        ["inline", '{"a": 1}', '{"a": 1}'],
        [
          "not-inline",
          `{
    "a": 1
  }`,
          `{
    "a": 1
  }`,
        ],
      ] as const)("%s", (_, source, expected) => {
        const res = editJson(source, [
          {
            kind,
            path: [],
            value: {},
          },
        ]);
        expect(res).toBe(expected);
      });
    });

    describe("single", () => {
      test.each([
        ["empty", "{}", '{\n  "b": "2"\n}'],
        ["inline", '{"a": 1}', '{"a": 1, "b": "2"}'],
        [
          "not-inline",
          `{
    "a": 1
  }`,
          `{
    "a": 1,
    "b": "2"
  }`,
        ],
      ] as const)("%s", (_, source, expected) => {
        const res = editJson(source, [
          {
            kind,
            path: [],
            value: {
              b: "2",
            },
          },
        ]);
        expect(res).toBe(expected);
      });
    });

    describe("multiple", () => {
      test.each([
        ["empty", "{}", '{\n  "b": "2",\n  "c": 3\n}'],
        ["inline", '{"a": 1}', '{"a": 1, "b": "2", "c": 3}'],
        [
          "not-inline",
          `{
    "a": 1
  }`,
          `{
    "a": 1,
    "b": "2",
    "c": 3
  }`,
        ],
      ] as const)("%s", (_, source, expected) => {
        const res = editJson(source, [
          {
            kind,
            path: [],
            value: {
              b: "2",
              c: 3,
            },
          },
        ]);
        expect(res).toBe(expected);
      });
    });

    describe("with property", () => {
      test("property not found", () => {
        expect(() =>
          editJson(`{"a": 1}`, [
            {
              kind,
              path: [],
              afterProp: "b",
              value: { c: 3 },
            },
          ])
        ).toThrow(`Object at "" does not have property "b"`);
      });

      describe("last", () => {
        test.each([
          ["inline", '{"a": 1, "b": 2}', '{"a": 1, "b": 2, "c": 3}'],
          [
            "not-inline",
            `{
        "a": 1,
      "b": 2
    }`,
            `{
        "a": 1,
      "b": 2,
        "c": 3
    }`,
          ],
        ] as const)("%s", (_, source, expected) => {
          const res = editJson(source, [
            {
              kind,
              path: [],
              value: { c: 3 },
              afterProp: "b",
            },
          ]);
          expect(res).toBe(expected);
        });
      });

      describe("rest", () => {
        test.each([
          ["inline", '{"a": 1, "c": 3}', '{"a": 1, "b": 2, "c": 3}'],
          [
            "not-inline",
            `{
        "a": 1,
      "c": 3
    }`,
            `{
        "a": 1,
        "b": 2,
      "c": 3
    }`,
          ],
        ] as const)("%s", (_, source, expected) => {
          const res = editJson(source, [
            {
              kind,
              path: [],
              value: { b: 2 },
              afterProp: "a",
            },
          ]);
          expect(res).toBe(expected);
        });
      });
    });
  });

  describe("multiple ops", () => {
    test("append multiple", () => {
      const res = editJson("[\n  0,\n  1,\n  2\n]", [
        {
          kind: "arrayAppend",
          path: [],
          value: [3],
        },
        {
          kind: "arrayAppend",
          path: [],
          value: [4],
        },
      ]);
      expect(res).toBe(`[\n  0,\n  1,\n  2,\n  3,\n  4\n]`);
    });

    test("throws on conflict", () => {
      const call = () =>
        editJson("[\n  0,\n  1,\n  2\n]", [
          {
            kind: "set",
            path: [1],
            value: 2,
          },
          {
            kind: "arrayRemove",
            path: [],
            index: 1,
          },
        ]);
      expect(call).toThrow(
        "Could not edit text. Check that operations does not conflict."
      );
    });
  });

  test("win eol", () => {
    const res = editJson("[\r\n  0,\r\n  1,\r\n  2,\r\n  4\r\n]", [
      {
        kind: "arrayAppend",
        path: [],
        value: [3],
        afterIndex: 2,
      },
    ]);
    expect(res).toBe("[\r\n  0,\r\n  1,\r\n  2,\r\n  3,\r\n  4\r\n]");
  });

  test("nested with inline", () => {
    const res = editJson("[0, 1, 2]", [
      {
        kind: "arrayAppend",
        path: [],
        value: [{ a: { b: ["c"] } }],
        afterIndex: 1,
      },
    ]);
    expect(res).toBe('[0, 1, { "a": { "b": [ "c" ] } }, 2]');
  });

  test("nested with non-inline", () => {
    const res = editJson("[\n  0,\n  1,\n  2\n]", [
      {
        kind: "arrayAppend",
        path: [],
        value: [{ a: { b: ["c"] } }],
        afterIndex: 1,
      },
    ]);
    expect(res).toBe(`[
  0,
  1,
  {
    "a": {
      "b": [
        "c"
      ]
    }
  },
  2
]`);
  });

  test("append to nested", () => {
    const source = `{
  "a": {
    "0": {
      "q": "_",
      "w": "_"
    }
  }
}`;
    const res = editJson(source, [
      {
        kind: "objectAppend",
        path: ["a"],
        value: {
          "1": {
            q: "_",
            w: "_",
          },
        },
      },
    ]);
    expect(res).toBe(`{
  "a": {
    "0": {
      "q": "_",
      "w": "_"
    },
    "1": {
      "q": "_",
      "w": "_"
    }
  }
}`);
  });
});
