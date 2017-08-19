create table if not exists image (
	project_id int not null primary key,
	data longblob not null,
	mimetype text not null,
	foreign key (project_id)
		references project(project_id)
		on delete cascade
);