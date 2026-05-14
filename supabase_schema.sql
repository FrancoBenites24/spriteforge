-- Habilitar extensión para UUIDs (normalmente ya habilitada en Supabase)
create extension if not exists "uuid-ossp";

-- 1. Crear tabla de Proyectos
create table if not exists public.projects (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    frame_width integer default 96 not null,
    frame_height integer default 96 not null,
    steps integer default 8 not null,
    speed integer default 100 not null
);

-- 2. Crear tabla de Frames
create table if not exists public.frames (
    id uuid default uuid_generate_v4() primary key,
    project_id uuid references public.projects(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    image_url text not null,
    position_index integer not null
);

-- 3. Habilitar Seguridad a Nivel de Fila (Row Level Security - RLS)
alter table public.projects enable row level security;
alter table public.frames enable row level security;

-- 4. Crear políticas de acceso (Permitiremos lectura/escritura anónima para facilitar la colaboración por ID)
create policy "Permitir lectura publica a proyectos" on public.projects for select using (true);
create policy "Permitir insercion publica a proyectos" on public.projects for insert with check (true);
create policy "Permitir actualizacion publica a proyectos" on public.projects for update using (true);

create policy "Permitir lectura publica a frames" on public.frames for select using (true);
create policy "Permitir insercion publica a frames" on public.frames for insert with check (true);
create policy "Permitir actualizacion publica a frames" on public.frames for update using (true);
create policy "Permitir borrado publico a frames" on public.frames for delete using (true);

-- 5. Crear el Bucket de Storage para guardar las imágenes recortadas
insert into storage.buckets (id, name, public) 
values ('sprites', 'sprites', true)
on conflict (id) do nothing;

-- 6. Crear políticas para el Bucket (Permitir subir, leer y borrar públicamente)
create policy "Permitir lectura publica de sprites" on storage.objects for select using (bucket_id = 'sprites');
create policy "Permitir subida publica de sprites" on storage.objects for insert with check (bucket_id = 'sprites');
create policy "Permitir borrado publico de sprites" on storage.objects for delete using (bucket_id = 'sprites');
create policy "Permitir actualizar publica de sprites" on storage.objects for update using (bucket_id = 'sprites');
