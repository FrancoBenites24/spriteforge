-- Habilitar extensión para UUIDs
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

-- 2. Crear tabla de Folders (Carpetas)
create table if not exists public.folders (
    id uuid default uuid_generate_v4() primary key,
    project_id uuid references public.projects(id) on delete cascade not null,
    name text not null,
    position_index integer not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Crear tabla de Subfolders (Subcarpetas)
create table if not exists public.subfolders (
    id uuid default uuid_generate_v4() primary key,
    folder_id uuid references public.folders(id) on delete cascade not null,
    name text not null,
    position_index integer not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Crear tabla de Frames (ahora vinculados a un subfolder)
create table if not exists public.frames (
    id uuid default uuid_generate_v4() primary key,
    subfolder_id uuid references public.subfolders(id) on delete cascade not null,
    project_id uuid references public.projects(id) on delete cascade not null, -- Mantenemos por conveniencia y seguridad
    image_url text not null,
    position_index integer not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Crear tabla de Snapshots (Versiones del proyecto)
create table if not exists public.snapshots (
    id uuid default uuid_generate_v4() primary key,
    project_id uuid references public.projects(id) on delete cascade not null,
    name text not null,
    data jsonb not null, -- Guardaremos el estado completo (folders, subfolders, frames) en JSON para restaurar rápido
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Habilitar Seguridad a Nivel de Fila (Row Level Security - RLS)
alter table public.projects enable row level security;
alter table public.folders enable row level security;
alter table public.subfolders enable row level security;
alter table public.frames enable row level security;
alter table public.snapshots enable row level security;

-- 7. Crear políticas de acceso (Permitiremos lectura/escritura anónima para facilitar la colaboración por ID)
create policy "Permitir lectura publica a proyectos" on public.projects for select using (true);
create policy "Permitir insercion publica a proyectos" on public.projects for insert with check (true);
create policy "Permitir actualizacion publica a proyectos" on public.projects for update using (true);

create policy "Permitir lectura publica a folders" on public.folders for select using (true);
create policy "Permitir insercion publica a folders" on public.folders for insert with check (true);
create policy "Permitir actualizacion publica a folders" on public.folders for update using (true);
create policy "Permitir borrado publico a folders" on public.folders for delete using (true);

create policy "Permitir lectura publica a subfolders" on public.subfolders for select using (true);
create policy "Permitir insercion publica a subfolders" on public.subfolders for insert with check (true);
create policy "Permitir actualizacion publica a subfolders" on public.subfolders for update using (true);
create policy "Permitir borrado publico a subfolders" on public.subfolders for delete using (true);

create policy "Permitir lectura publica a frames" on public.frames for select using (true);
create policy "Permitir insercion publica a frames" on public.frames for insert with check (true);
create policy "Permitir actualizacion publica a frames" on public.frames for update using (true);
create policy "Permitir borrado publico a frames" on public.frames for delete using (true);

create policy "Permitir lectura publica a snapshots" on public.snapshots for select using (true);
create policy "Permitir insercion publica a snapshots" on public.snapshots for insert with check (true);

-- 8. Crear el Bucket de Storage para guardar las imágenes recortadas
insert into storage.buckets (id, name, public) 
values ('sprites', 'sprites', true)
on conflict (id) do nothing;

-- 9. Crear políticas para el Bucket (Permitir subir, leer y borrar públicamente)
create policy "Permitir lectura publica de sprites" on storage.objects for select using (bucket_id = 'sprites');
create policy "Permitir subida publica de sprites" on storage.objects for insert with check (bucket_id = 'sprites');
create policy "Permitir borrado publico de sprites" on storage.objects for delete using (bucket_id = 'sprites');
create policy "Permitir actualizar publica de sprites" on storage.objects for update using (bucket_id = 'sprites');
