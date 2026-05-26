ALTER TABLE public.knowledge_benchmarks DROP CONSTRAINT knowledge_benchmarks_tier_check;
ALTER TABLE public.knowledge_benchmarks ADD CONSTRAINT knowledge_benchmarks_tier_check CHECK (tier IN ('nano','micro','mid','macro','overall'));
ALTER TABLE public.knowledge_benchmarks DROP CONSTRAINT knowledge_benchmarks_format_check;
ALTER TABLE public.knowledge_benchmarks ADD CONSTRAINT knowledge_benchmarks_format_check CHECK (format IN ('reels','carousels','images','albums','statuses','links','native_documents','multi_image','videos','texts','polls'));
ALTER TABLE public.knowledge_benchmarks ALTER COLUMN sample_size DROP NOT NULL;