"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  GripVertical,
  ImageIcon,
  Pencil,
  Plus,
  Search,
  Shapes,
  Trash2,
  Upload,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Modal } from "@/components/modal";
import {
  arasaacPictogramUrl,
  curatedAacPhotos,
} from "@/lib/aac-visuals";
import {
  createId,
  representationUsesPhotos,
  type BoardCategory,
  type StudentBoardItem,
  type StudentProfile,
} from "@/lib/ariadne-store";
import "./student-board-editor.css";

type SearchResult = {
  id: string;
  label?: string;
  title?: string;
  imageUrl: string;
  arasaacId?: number;
  sourceUrl?: string;
  license?: string;
  creator?: string;
};

type ItemDraft = {
  id?: string;
  label: string;
  categoryId: string;
  visualType: StudentBoardItem["visualType"];
  arasaacId?: number;
  photoUrl?: string;
  photoSourceUrl?: string;
  attribution?: string;
};

function visualUrl(item: StudentBoardItem, student: StudentProfile) {
  if (representationUsesPhotos(student.representation)) {
    return (
      student.customPhotos[item.id] ??
      student.customPhotos[item.label.toLowerCase()] ??
      item.photoUrl ??
      ""
    );
  }
  if (item.arasaacId) {
    return arasaacPictogramUrl(item.arasaacId);
  }
  return "";
}

export function StudentBoardEditor({
  student,
  onChange,
}: {
  student: StudentProfile;
  onChange: (patch: Partial<StudentProfile>) => void;
}) {
  const categories = useMemo(
    () => [...student.boardCategories].sort((a, b) => a.order - b.order),
    [student.boardCategories],
  );
  const [activeCategory, setActiveCategory] = useState(
    categories[0]?.id ?? "core",
  );
  const [itemOpen, setItemOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [draft, setDraft] = useState<ItemDraft>({
    label: "",
    categoryId: activeCategory,
    visualType: "inherit",
  });
  const [source, setSource] = useState<"arasaac" | "photos" | "upload">(
    "arasaac",
  );
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const items = [...student.boardItems]
    .filter((item) => item.categoryId === activeCategory && !item.hidden)
    .sort((a, b) =>
      activeCategory === "core"
        ? (b.usageCount ?? 0) - (a.usageCount ?? 0) || a.order - b.order
        : a.order - b.order,
    );

  function updateItems(boardItems: StudentBoardItem[]) {
    const customPhotos = { ...student.customPhotos };
    boardItems.forEach((item) => {
      if (item.photoUrl) customPhotos[item.id] = item.photoUrl;
      else delete customPhotos[item.id];
    });
    onChange({ boardItems, customPhotos });
  }

  function openNewItem() {
    setDraft({
      label: "",
      categoryId: activeCategory,
      visualType: "inherit",
    });
    setQuery("");
    setResults([]);
    setSearchError("");
    setSource("arasaac");
    setItemOpen(true);
  }

  function openEditItem(item: StudentBoardItem) {
    setDraft({
      id: item.id,
      label: item.label,
      categoryId: item.categoryId,
      visualType: item.visualType,
      arasaacId: item.arasaacId,
      photoUrl: item.photoUrl,
      photoSourceUrl: item.photoSourceUrl,
      attribution: item.attribution,
    });
    setQuery(item.label);
    setResults([]);
    setSearchError("");
    setSource(item.photoUrl ? "photos" : "arasaac");
    setItemOpen(true);
  }

  function saveItem() {
    if (!draft.label.trim() || !draft.arasaacId) return;
    const existing = draft.id
      ? student.boardItems.find((item) => item.id === draft.id)
      : undefined;
    const nextItem: StudentBoardItem = {
      id: draft.id ?? createId("word"),
      label: draft.label.trim(),
      categoryId: draft.categoryId,
      kind:
        draft.categoryId === "core"
          ? "core"
          : ["help", "stop", "break", "no", "pain"].includes(
                draft.label.toLowerCase(),
              )
            ? "safety"
            : "fringe",
      order:
        existing?.order ??
        Math.max(
          -1,
          ...student.boardItems
            .filter((item) => item.categoryId === draft.categoryId)
            .map((item) => item.order),
        ) + 1,
      visualType: "inherit",
      arasaacId: draft.arasaacId,
      photoUrl: draft.photoUrl,
      photoSourceUrl: draft.photoSourceUrl,
      attribution: draft.attribution,
    };
    updateItems(
      existing
        ? student.boardItems.map((item) =>
            item.id === existing.id ? nextItem : item,
          )
        : [...student.boardItems, nextItem],
    );
    setActiveCategory(nextItem.categoryId);
    setItemOpen(false);
  }

  async function searchVisuals() {
    if (query.trim().length < 2) return;
    setSearching(true);
    setSearchError("");
    try {
      const endpoint =
        source === "photos"
          ? `/api/photos/search?q=${encodeURIComponent(query)}`
          : `/api/pictograms/search?q=${encodeURIComponent(query)}`;
      const response = await fetch(endpoint);
      const payload = (await response.json()) as {
        results?: SearchResult[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Visual search is unavailable.");
      }
      setResults(payload.results ?? []);
      if (source === "arasaac" && payload.results?.[0]?.arasaacId) {
        const match = payload.results[0];
        setDraft((current) => ({
          ...current,
          label: current.label || match.label || query,
          arasaacId: match.arasaacId,
          attribution: "Sergio Palao · ARASAAC · CC BY-NC-SA",
        }));
      }
      if (!payload.results?.length) {
        setSearchError(
          source === "photos"
            ? "No licensed photos matched this search. Try a simpler concrete word."
            : "No ARASAAC symbols matched this search.",
        );
      }
    } catch (error) {
      setResults([]);
      setSearchError(
        error instanceof Error ? error.message : "Visual search is unavailable.",
      );
    } finally {
      setSearching(false);
    }
  }

  function moveItem(itemId: string, direction: -1 | 1) {
    const ordered = [...items];
    const index = ordered.findIndex((item) => item.id === itemId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    const orderById = new Map(
      ordered.map((item, itemIndex) => [item.id, itemIndex]),
    );
    updateItems(
      student.boardItems.map((item) =>
        orderById.has(item.id)
          ? { ...item, order: orderById.get(item.id) ?? item.order }
          : item,
      ),
    );
  }

  function dropOn(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    const ordered = [...items];
    const from = ordered.findIndex((item) => item.id === draggedId);
    const to = ordered.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    const orderById = new Map(
      ordered.map((item, itemIndex) => [item.id, itemIndex]),
    );
    updateItems(
      student.boardItems.map((item) =>
        orderById.has(item.id)
          ? { ...item, order: orderById.get(item.id) ?? item.order }
          : item,
      ),
    );
    setDraggedId(null);
  }

  function moveCategory(category: BoardCategory, direction: -1 | 1) {
    const index = categories.findIndex((item) => item.id === category.id);
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const ordered = [...categories];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    onChange({
      boardCategories: ordered.map((item, itemIndex) => ({
        ...item,
        order: itemIndex,
      })),
    });
  }

  return (
    <section className="board-editor card">
      <header className="board-editor-heading">
        <div>
          <p className="eyebrow">Student communication board</p>
          <h2>Customize {student.firstName}&apos;s vocabulary</h2>
          <p>
            Drag words into position, create categories, or replace any visual.
            Changes appear automatically in Student Space.
          </p>
        </div>
        <div>
          <button
            className="button button-secondary"
            onClick={() => setCategoryOpen(true)}
            type="button"
          >
            <Plus size={16} /> Category
          </button>
          <button className="button button-primary" onClick={openNewItem} type="button">
            <Plus size={16} /> Word
          </button>
        </div>
      </header>

      <div className="board-category-tabs" role="tablist">
        {categories.map((category, index) => (
          <div className={activeCategory === category.id ? "active" : ""} key={category.id}>
            <button
              onClick={() => setActiveCategory(category.id)}
              role="tab"
              style={{ "--category-color": category.color } as React.CSSProperties}
              type="button"
            >
              {category.label}
              <small>
                {student.boardItems.filter(
                  (item) => item.categoryId === category.id && !item.hidden,
                ).length}
              </small>
            </button>
            <span>
              <button
                aria-label={`Move ${category.label} left`}
                disabled={index === 0}
                onClick={() => moveCategory(category, -1)}
                type="button"
              >
                <ArrowLeft size={11} />
              </button>
              <button
                aria-label={`Move ${category.label} right`}
                disabled={index === categories.length - 1}
                onClick={() => moveCategory(category, 1)}
                type="button"
              >
                <ArrowRight size={11} />
              </button>
            </span>
          </div>
        ))}
      </div>

      <div className="board-item-grid">
        {items.map((item, index) => {
          const url = visualUrl(item, student);
          const curated =
            representationUsesPhotos(student.representation) && !url
              ? curatedAacPhotos[item.id]
              : undefined;
          return (
            <article
              draggable
              key={item.id}
              onDragOver={(event) => event.preventDefault()}
              onDragStart={() => setDraggedId(item.id)}
              onDrop={() => dropOn(item.id)}
            >
              <span className="board-drag"><GripVertical size={16} /></span>
              <button
                aria-label={`Edit ${item.label}`}
                className="board-item-main"
                onClick={() => openEditItem(item)}
                type="button"
              >
                <span>
                  {url ? (
                    <Image
                      alt=""
                      height={120}
                      src={url}
                      unoptimized={representationUsesPhotos(student.representation)}
                      width={120}
                    />
                  ) : curated ? (
                    <span
                      aria-hidden="true"
                      className={`board-curated-photo board-curated-${curated.sheet}`}
                      style={{ backgroundPosition: curated.position }}
                    />
                  ) : (
                    <strong>{item.label}</strong>
                  )}
                </span>
                <b>{item.label}</b>
              </button>
              <div className="board-item-actions">
                <button
                  aria-label={`Move ${item.label} left`}
                  disabled={index === 0}
                  onClick={() => moveItem(item.id, -1)}
                  type="button"
                >
                  <ArrowLeft size={13} />
                </button>
                <button
                  aria-label={`Move ${item.label} right`}
                  disabled={index === items.length - 1}
                  onClick={() => moveItem(item.id, 1)}
                  type="button"
                >
                  <ArrowRight size={13} />
                </button>
                <button aria-label={`Edit ${item.label}`} onClick={() => openEditItem(item)} type="button">
                  <Pencil size={13} />
                </button>
              </div>
            </article>
          );
        })}
        <button className="board-add-tile" onClick={openNewItem} type="button">
          <Plus size={23} />
          Add a word
        </button>
      </div>

      <Modal
        description="Categories appear in the same order in Student Space."
        onClose={() => setCategoryOpen(false)}
        open={categoryOpen}
        size="small"
        title="Create a category"
      >
        <div className="field">
          <label htmlFor="new-category">Category name</label>
          <input
            className="input"
            id="new-category"
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="e.g. Places"
            value={categoryName}
          />
        </div>
        <div className="modal-actions">
          <button
            className="button button-primary"
            disabled={!categoryName.trim()}
            onClick={() => {
              const id = createId("category");
              onChange({
                boardCategories: [
                  ...categories,
                  {
                    id,
                    label: categoryName.trim(),
                    color: "#7b9f96",
                    order: categories.length,
                  },
                ],
              });
              setActiveCategory(id);
              setCategoryName("");
              setCategoryOpen(false);
            }}
            type="button"
          >
            Create category
          </button>
        </div>
      </Modal>

      <Modal
        description="Every word stores one ARASAAC pictogram and may also store a selected photo. The learner profile decides which one is shown."
        onClose={() => setItemOpen(false)}
        open={itemOpen}
        size="large"
        title={draft.id ? `Edit ${draft.label}` : "Add vocabulary"}
      >
        <div className="board-item-form">
          <div className="form-grid">
            <div className="field">
              <label htmlFor="board-label">Word or message</label>
              <input
                className="input"
                id="board-label"
                onChange={(event) => setDraft({ ...draft, label: event.target.value })}
                value={draft.label}
              />
            </div>
            <div className="field">
              <label htmlFor="board-category">Category</label>
              <select
                className="select"
                id="board-category"
                onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
                value={draft.categoryId}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="visual-source-tabs">
            <button className={source === "arasaac" ? "active" : ""} onClick={() => {
              setSource("arasaac");
              setResults([]);
              setSearchError("");
            }} type="button">
              <Shapes size={16} /> ARASAAC symbols
            </button>
            <button className={source === "photos" ? "active" : ""} onClick={() => {
              setSource("photos");
              setResults([]);
              setSearchError("");
            }} type="button">
              <ImageIcon size={16} /> Real photos
            </button>
            <button className={source === "upload" ? "active" : ""} onClick={() => {
              setSource("upload");
              setResults([]);
              setSearchError("");
            }} type="button">
              <Upload size={16} /> Upload familiar photo
            </button>
          </div>

          {source === "upload" ? (
            <label className="photo-upload-zone">
              <Upload size={24} />
              <strong>Choose a photo from this device</strong>
              <span>Use a clear, familiar image with minimal background.</span>
              <input
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () =>
                    setDraft({
                      ...draft,
                      photoUrl: String(reader.result),
                      attribution: "Educator-provided familiar photo",
                    });
                  reader.readAsDataURL(file);
                }}
                type="file"
              />
            </label>
          ) : (
            <>
              <form
                className="visual-search"
                onSubmit={(event) => {
                  event.preventDefault();
                  void searchVisuals();
                }}
              >
                <Search size={17} />
                <input
                  aria-label={`Search ${source === "photos" ? "real photos" : "ARASAAC symbols"}`}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={source === "photos" ? "e.g. yellow school bus" : "e.g. bathroom"}
                  value={query}
                />
                <button className="button button-primary" disabled={searching || query.trim().length < 2} type="submit">
                  {searching ? "Searching…" : "Search"}
                </button>
              </form>
              <div className="visual-results">
                {results.map((result) => (
                  <button
                    className={
                      draft.photoUrl === result.imageUrl ||
                      draft.arasaacId === result.arasaacId
                        ? "selected"
                        : ""
                    }
                    key={result.id}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        label: draft.label || result.label || query,
                        visualType: "inherit",
                        arasaacId: result.arasaacId ?? draft.arasaacId,
                        photoUrl:
                          source === "photos" ? result.imageUrl : draft.photoUrl,
                        photoSourceUrl: result.sourceUrl,
                        attribution:
                          source === "photos"
                            ? `${result.creator ?? "Openverse contributor"} · ${result.license ?? "See source"}`
                            : "Sergio Palao · ARASAAC · CC BY-NC-SA",
                      })
                    }
                    type="button"
                  >
                    <Image
                      alt=""
                      height={110}
                      src={result.imageUrl}
                      unoptimized={source === "photos"}
                      width={110}
                    />
                    <span>{result.label ?? result.title}</span>
                    {(draft.photoUrl === result.imageUrl ||
                      draft.arasaacId === result.arasaacId) && <Check size={15} />}
                  </button>
                ))}
              </div>
              {searchError ? (
                <p className="visual-search-message" role="status">
                  {searchError}
                </p>
              ) : null}
            </>
          )}

          <div className="selected-visual">
            <span>Saved visual pair</span>
            {draft.arasaacId ? (
              <Image
                alt="Selected ARASAAC pictogram"
                height={100}
                src={`https://static.arasaac.org/pictograms/${draft.arasaacId}/${draft.arasaacId}_500.png`}
                width={100}
              />
            ) : (
              <strong>Search and select the ARASAAC pictogram first.</strong>
            )}
            {draft.photoUrl ? (
              <Image
                alt="Selected real photo"
                height={100}
                src={draft.photoUrl}
                unoptimized
                width={100}
              />
            ) : (
              <small>No photo selected. Photo-based profiles will show that this word needs a photo.</small>
            )}
          </div>
        </div>
        <div className="modal-actions split">
          {draft.id ? (
            <button
              className="button button-danger"
              onClick={() => {
                updateItems(student.boardItems.filter((item) => item.id !== draft.id));
                setItemOpen(false);
              }}
              type="button"
            >
              <Trash2 size={15} /> Remove
            </button>
          ) : <span />}
          <button className="button button-primary" disabled={!draft.label.trim() || !draft.arasaacId} onClick={saveItem} type="button">
            Save to {student.firstName}&apos;s board
          </button>
        </div>
      </Modal>
    </section>
  );
}
