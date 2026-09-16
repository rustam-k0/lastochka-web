import { useEffect } from "react";
import { searchProducts } from "../services/shop";
type Registry = {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function useWebMCP() {
  useEffect(() => {
    const context = (document as Document & { modelContext?: Registry })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: "search_shop_products",
            description:
              "Search the demonstration Lastochka catalog by Russian product name or category. Read-only; does not change the cart.",
            inputSchema: {
              type: "object",
              properties: { query: { type: "string", maxLength: 120 } },
              required: ["query"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true },
            execute(input) {
              if (
                !input ||
                typeof input !== "object" ||
                !("query" in input) ||
                typeof input.query !== "string" ||
                input.query.length > 120 ||
                Object.keys(input).some((k) => k !== "query")
              )
                throw new Error(
                  "Expected only a query string, up to 120 characters.",
                );
              return searchProducts(input.query).map(
                ({ id, name, price, stock }) => ({
                  id,
                  name,
                  priceKopecks: price,
                  stock,
                  url: "/product/" + id,
                }),
              );
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {
      /* Optional browser API; the visible search remains available. */
    }
    return () => lifecycle.abort();
  }, []);
}
