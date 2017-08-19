create table if not exists project (
	project_id int auto_increment primary key,
	title text not null,
	target double precision not null,
	subtitle text,
	description text,
	image_uri text,
	creation_date timestamp not null default now()
);