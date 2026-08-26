'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, type ProductCreateInput } from '@/lib/admin-api';
import { contentApi, type MediaEntry } from '@/lib/content-api';
import { pushToast } from '@/components/shared/Toast';

const NAME_MIN = 3;
const NAME_MAX = 120;
const DESCRIPTION_MAX = 5000;

interface TaxonomyOption {
  id: string;
  slug: string;
  name: string;
}

interface ComboboxProps {
  label: string;
  options: TaxonomyOption[];
  value: string;
  onChange: (value: string) => void;
  onCreateNew: (name: string) => Promise<string>;
  placeholder?: string;
}

function ComboboxInput({ label, options, value, onChange, onCreateNew, placeholder }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === value);
  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(query.toLowerCase())
  );
  const exactMatch = options.some(
    (o) => o.name.toLowerCase() === query.toLowerCase()
  );
  const showCreate = query.trim().length > 0 && !exactMatch && !creating;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      onChange(id);
      setOpen(false);
      setQuery('');
    },
    [onChange]
  );

  const handleCreate = useCallback(async () => {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    try {
      const created = await onCreateNew(name);
      onChange(created);
      setOpen(false);
      setQuery('');
    } catch {
      pushToast({ title: 'ERROR', description: `Failed to create ${label.toLowerCase()}`, variant: 'error' });
    } finally {
      setCreating(false);
    }
  }, [query, onCreateNew, onChange, label]);

  return (
    <div className="flex flex-col gap-2" ref={containerRef}>
      <label className="font-cinzel font-bold text-sm uppercase tracking-widest text-[#6B6B80]">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setOpen(!open);
            if (!open) setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="w-full bg-[#16161F] border border-[#2A2A3A] rounded-lg px-4 py-3 font-inter text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none transition-colors text-left flex items-center justify-between"
        >
          <span className={selected ? '' : 'text-[#6B6B80]'}>
            {selected ? selected.name : '— None —'}
          </span>
          <svg className={`w-4 h-4 text-[#6B6B80] transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full bg-[#16161F] border border-[#2A2A3A] rounded-lg shadow-xl max-h-60 overflow-auto">
            <div className="p-2 border-b border-[#2A2A3A]">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-[#0A0A0F] border border-[#2A2A3A] rounded px-3 py-2 font-inter text-sm text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none"
              />
            </div>
            <div className="py-1">
              {filtered.length === 0 && !showCreate && (
                <div className="px-4 py-2 text-sm text-[#6B6B80] font-inter">No results</div>
              )}
              {filtered.map((opt, idx) => (
                <button
                  key={`${opt.id}-${idx}`}
                  type="button"
                  onClick={() => handleSelect(opt.id)}
                  className={`w-full text-left px-4 py-2 text-sm font-inter transition-colors ${
                    opt.id === value
                      ? 'bg-[#FF6B00]/20 text-[#FF6B00]'
                      : 'text-[#F0F0F0] hover:bg-[#2A2A3A]'
                  }`}
                >
                  {opt.name}
                </button>
              ))}
              {showCreate && (
                <button
                  type="button"
                  onClick={handleCreate}
                  className="w-full text-left px-4 py-2 text-sm font-inter text-[#3DDC84] hover:bg-[#3DDC84]/10 transition-colors flex items-center gap-2"
                >
                  <span className="text-[#3DDC84]">+</span>
                  CREATE NEW &ldquo;{query.trim()}&rdquo;
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ImageItem {
  file: File;
  preview: string;
  uploading: boolean;
  uploaded?: MediaEntry;
}

export default function NewProductPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [animeId, setAnimeId] = useState('');
  const [characterId, setCharacterId] = useState('');
  const [status, setStatus] = useState<'draft' | 'active' | 'archived'>('draft');
  const [featured, setFeatured] = useState(false);
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [stock, setStock] = useState('');

  const [categories, setCategories] = useState<TaxonomyOption[]>([]);
  const [animes, setAnimes] = useState<TaxonomyOption[]>([]);
  const [characters, setCharacters] = useState<TaxonomyOption[]>([]);

  const [images, setImages] = useState<ImageItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
    Promise.all([
      fetch(`${base}/api/v1/taxonomies/categories`).then((r) => r.json()),
      fetch(`${base}/api/v1/taxonomies/animes`).then((r) => r.json()),
      fetch(`${base}/api/v1/taxonomies/characters`).then((r) => r.json()),
    ]).then(([cats, anis, chars]) => {
      setCategories(cats);
      setAnimes(anis);
      setCharacters(chars);
    }).catch(() => {});
  }, []);

  const nameValid = name.trim().length >= NAME_MIN;
  const canSubmit = nameValid && !!categoryId && !saving;

  const handleAddImages = useCallback((files: FileList | null) => {
    if (!files) return;
    const newItems: ImageItem[] = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
    }));
    setImages((prev) => [...prev, ...newItems]);
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => {
      const item = prev[index];
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleReorderImage = useCallback((index: number, direction: -1 | 1) => {
    setImages((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const uploadImages = useCallback(async (): Promise<{ url: string; mediaId: string; altText: string; isPrimary: boolean }[]> => {
    const results: { url: string; mediaId: string; altText: string; isPrimary: boolean }[] = [];
    for (let i = 0; i < images.length; i++) {
      const item = images[i];
      if (item.uploaded) {
        results.push({
          url: item.uploaded.url,
          mediaId: item.uploaded.id,
          altText: name.trim(),
          isPrimary: i === 0,
        });
        continue;
      }
      setImages((prev) => prev.map((img, idx) => idx === i ? { ...img, uploading: true } : img));
      try {
        const entry = await contentApi.uploadMedia(item.file, 'products');
        setImages((prev) => prev.map((img, idx) => idx === i ? { ...img, uploading: false, uploaded: entry } : img));
        results.push({
          url: entry.url,
          mediaId: entry.id,
          altText: name.trim(),
          isPrimary: i === 0,
        });
      } catch {
        setImages((prev) => prev.map((img, idx) => idx === i ? { ...img, uploading: false } : img));
        pushToast({ title: 'UPLOAD FAILED', description: `Image ${i + 1} failed to upload`, variant: 'error' });
      }
    }
    return results;
  }, [images, name]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      const input: ProductCreateInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        categoryId: categoryId || undefined,
        animeId: animeId || null,
        characterId: characterId || null,
        status,
        featured,
        price: price.trim() || undefined,
        compareAtPrice: compareAtPrice.trim() || undefined,
        stock: stock.trim() || undefined,
      };
      const { id } = await adminApi.createProduct(input);

      if (images.length > 0) {
        const uploaded = await uploadImages();
        if (uploaded.length > 0) {
          await adminApi.setProductImages(id, uploaded);
        }
      }

      pushToast({ title: 'PRODUCT CREATED', description: name.trim(), variant: 'success' });
      router.push(`/admin/products/${id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create product';
      pushToast({ title: 'ERROR', description: msg, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F0F0F0] p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="font-cinzel text-2xl md:text-3xl font-bold tracking-wider mb-8">NEW PRODUCT</h1>

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        {/* NAME */}
        <div className="flex flex-col gap-2">
          <label className="font-cinzel font-bold text-sm uppercase tracking-widest text-[#6B6B80]">
            NAME <span className="text-[#CC0000]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={NAME_MIN}
            maxLength={NAME_MAX}
            required
            className="bg-[#16161F] border border-[#2A2A3A] rounded-lg px-4 py-3 font-inter text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none transition-colors"
            placeholder="Product name"
          />
          <span className="text-xs text-[#6B6B80]">{name.length}/{NAME_MAX}</span>
        </div>

        {/* DESCRIPTION */}
        <div className="flex flex-col gap-2">
          <label className="font-cinzel font-bold text-sm uppercase tracking-widest text-[#6B6B80]">
            DESCRIPTION
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={DESCRIPTION_MAX}
            rows={4}
            className="bg-[#16161F] border border-[#2A2A3A] rounded-lg px-4 py-3 font-inter text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none transition-colors resize-y"
            placeholder="Product description"
          />
          <span className="text-xs text-[#6B6B80]">{description.length}/{DESCRIPTION_MAX}</span>
        </div>

        {/* CATEGORY */}
        <div className="flex flex-col gap-2">
          <label className="font-cinzel font-bold text-sm uppercase tracking-widest text-[#6B6B80]">
            CATEGORY <span className="text-[#CC0000]">*</span>
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="bg-[#16161F] border border-[#2A2A3A] rounded-lg px-4 py-3 font-inter text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none transition-colors"
          >
            <option value="">— Select category —</option>
            {categories.map((c, i) => (
              <option key={`${c.id}-${i}`} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* ANIME */}
        <ComboboxInput
          label="ANIME"
          options={animes}
          value={animeId}
          onChange={setAnimeId}
          onCreateNew={async (n) => {
            const created = await adminApi.createAnime(n);
            setAnimes((prev) => [...prev, created]);
            return created.id;
          }}
        />

        {/* CHARACTER */}
        <ComboboxInput
          label="CHARACTER"
          options={characters}
          value={characterId}
          onChange={setCharacterId}
          onCreateNew={async (n) => {
            const created = await adminApi.createCharacter(n);
            setCharacters((prev) => [...prev, created]);
            return created.id;
          }}
        />

        {/* PRICE + STOCK */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex flex-col gap-2 flex-1">
            <label className="font-cinzel font-bold text-sm uppercase tracking-widest text-[#6B6B80]">
              PRICE (USD)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="bg-[#16161F] border border-[#2A2A3A] rounded-lg px-4 py-3 font-inter text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none transition-colors"
              placeholder="0.00"
            />
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <label className="font-cinzel font-bold text-sm uppercase tracking-widest text-[#6B6B80]">
              COMPARE AT PRICE
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={compareAtPrice}
              onChange={(e) => setCompareAtPrice(e.target.value)}
              className="bg-[#16161F] border border-[#2A2A3A] rounded-lg px-4 py-3 font-inter text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none transition-colors"
              placeholder="0.00 (optional)"
            />
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <label className="font-cinzel font-bold text-sm uppercase tracking-widest text-[#6B6B80]">
              STOCK QTY
            </label>
            <input
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="bg-[#16161F] border border-[#2A2A3A] rounded-lg px-4 py-3 font-inter text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none transition-colors"
              placeholder="0"
            />
          </div>
        </div>

        {/* IMAGES */}
        <div className="flex flex-col gap-2">
          <label className="font-cinzel font-bold text-sm uppercase tracking-widest text-[#6B6B80]">
            IMAGES
          </label>
          <div className="flex flex-wrap gap-3">
            {images.map((item, i) => (
              <div
                key={item.preview}
                className="relative w-24 h-24 rounded-lg overflow-hidden border border-[#2A2A3A] group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.preview} alt="" className="w-full h-full object-cover" />
                {item.uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 bg-black/50">
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => handleReorderImage(i, -1)}
                      className="w-6 h-6 rounded bg-[#2A2A3A] text-[#F0F0F0] text-xs flex items-center justify-center hover:bg-[#FF6B00]"
                    >
                      ←
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(i)}
                    className="w-6 h-6 rounded bg-[#CC0000] text-[#F0F0F0] text-xs flex items-center justify-center hover:bg-[#FF0000]"
                  >
                    ✕
                  </button>
                  {i < images.length - 1 && (
                    <button
                      type="button"
                      onClick={() => handleReorderImage(i, 1)}
                      className="w-6 h-6 rounded bg-[#2A2A3A] text-[#F0F0F0] text-xs flex items-center justify-center hover:bg-[#FF6B00]"
                    >
                      →
                    </button>
                  )}
                </div>
                {i === 0 && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#FFB800] text-[#0A0A0F] text-[9px] font-cinzel font-bold rounded">
                    PRIMARY
                  </div>
                )}
              </div>
            ))}
            <label className="w-24 h-24 rounded-lg border-2 border-dashed border-[#2A2A3A] hover:border-[#FF6B00] transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 text-[#6B6B80] hover:text-[#FF6B00]">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="text-[9px] font-cinzel font-bold uppercase">ADD</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleAddImages(e.target.files)}
              />
            </label>
          </div>
        </div>

        {/* STATUS + FEATURED */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex flex-col gap-2 flex-1">
            <label className="font-cinzel font-bold text-sm uppercase tracking-widest text-[#6B6B80]">
              STATUS
            </label>
            <div className="flex gap-2">
              {(['draft', 'active', 'archived'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`flex-1 h-[44px] rounded-lg font-cinzel font-bold text-sm tracking-wider uppercase transition-all ${
                    status === s
                      ? s === 'active'
                        ? 'bg-[#3DDC84] text-[#0A0A0F]'
                        : s === 'archived'
                          ? 'bg-[#6B6B80] text-[#F0F0F0]'
                          : 'bg-[#FF6B00] text-[#F0F0F0]'
                      : 'bg-[#16161F] text-[#6B6B80] border border-[#2A2A3A] hover:border-[#FF6B00]/40'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-cinzel font-bold text-sm uppercase tracking-widest text-[#6B6B80]">
              FEATURED
            </label>
            <button
              type="button"
              onClick={() => setFeatured(!featured)}
              className={`h-[44px] px-6 rounded-lg font-cinzel font-bold text-sm tracking-wider uppercase transition-all ${
                featured
                  ? 'bg-[#FFB800] text-[#0A0A0F]'
                  : 'bg-[#16161F] text-[#6B6B80] border border-[#2A2A3A] hover:border-[#FFB800]/40'
              }`}
            >
              {featured ? 'YES' : 'NO'}
            </button>
          </div>
        </div>

        {/* SUBMIT */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.push('/admin/products')}
            className="h-[52px] px-6 rounded-lg font-cinzel font-bold text-sm tracking-wider bg-[#16161F] text-[#6B6B80] border border-[#2A2A3A] hover:border-[#FF6B00]/40 transition-all"
          >
            CANCEL
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 h-[52px] rounded-lg font-cinzel font-bold text-sm tracking-wider bg-[#CC0000] text-[#F0F0F0] hover:bg-[#FF6B00] disabled:bg-[#16161F] disabled:text-[#6B6B80] disabled:border disabled:border-[#2A2A3A] transition-all active:scale-[0.98]"
          >
            {saving ? 'CREATING…' : 'CREATE PRODUCT'}
          </button>
        </div>
      </form>
    </div>
  );
}
