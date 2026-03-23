import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../../services/apiClient";

const PAGE_SIZE = 25;

function formatPhone(phone) {
  if (!phone) return "—";

  const digits = String(phone).replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return phone;
}

function getDisplayName(client) {
  if (client.preferredName?.trim()) return client.preferredName.trim();
  if (client.legalName?.trim()) return client.legalName.trim();
  return "Unnamed client";
}

export default function ClientsPage() { 
  const STUDIO_ID = "69936f65681b262ca3739f92";
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let ignore = false;

    async function loadFirstPage() {
      try {
        setIsInitialLoading(true);
        setError("");

       const studioId = STUDIO_ID;

        const params = new URLSearchParams({
          studioId,
          page: "1",
          limit: String(PAGE_SIZE),
        });

        if (debouncedSearch) {
          params.set("search", debouncedSearch);
        }

        const data = await apiGet(`/api/client/staff-directory?${params.toString()}`);

        if (ignore) return;

        setItems(Array.isArray(data.items) ? data.items : []);
        setPage(data.page || 1);
        setHasMore(Boolean(data.hasMore));
        setTotal(Number(data.total || 0));
      } catch (err) {
        if (ignore) return;
        setError(err?.message || "Failed to load clients");
        setItems([]);
        setPage(1);
        setHasMore(false);
        setTotal(0);
      } finally {
        if (!ignore) {
          setIsInitialLoading(false);
        }
      }
    }

    loadFirstPage();

    return () => {
      ignore = true;
    };
  }, [debouncedSearch]);

  async function handleLoadMore() {
    try {
      setIsLoadingMore(true);
      setError("");

      const nextPage = page + 1;

      const studioId = STUDIO_ID;

      const params = new URLSearchParams({
        studioId,
        page: String(nextPage),
        limit: String(PAGE_SIZE),
      });

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      const data = await apiGet(`/api/client/staff-directory?${params.toString()}`);

      setItems((prev) => [...prev, ...(Array.isArray(data.items) ? data.items : [])]);
      setPage(data.page || nextPage);
      setHasMore(Boolean(data.hasMore));
      setTotal(Number(data.total || 0));
    } catch (err) {
      setError(err?.message || "Failed to load more clients");
    } finally {
      setIsLoadingMore(false);
    }
  }

  const resultsLabel = useMemo(() => {
    if (debouncedSearch) {
      return `${total} matching client${total === 1 ? "" : "s"}`;
    }

    return `${total} client${total === 1 ? "" : "s"}`;
  }, [debouncedSearch, total]);

  return (
    <div className="flex min-h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Clients</h1>
          <p className="text-sm text-zinc-400">
            Search by name, email, or phone number.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
          <label htmlFor="client-search" className="mb-2 block text-sm text-zinc-300">
            Search clients
          </label>
          <input
            id="client-search"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email, or phone"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-zinc-500"
          />
        </div>

        <div className="text-sm text-zinc-400">{resultsLabel}</div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {isInitialLoading ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-300">
          Loading clients...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 text-sm text-zinc-400">
          {debouncedSearch
            ? "No clients matched your search."
            : "No clients are available for this studio yet."}
        </div>
      ) : (
        <>
          <div className="max-h-[65vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/70">
            <div className="divide-y divide-zinc-800">
              {items.map((client) => (
                <div
                  key={client._id}
                  className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate text-base font-medium text-zinc-100">
                      {getDisplayName(client)}
                    </div>

                    {client.legalName &&
                    client.preferredName &&
                    client.legalName !== client.preferredName ? (
                      <div className="truncate text-sm text-zinc-400">
                        Legal: {client.legalName}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-1 text-sm text-zinc-300 sm:text-right">
                    <div className="break-all">{client.email || "—"}</div>
                    <div>{formatPhone(client.phoneE164)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {hasMore ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}