create table if not exists reward (
	reward_id int auto_increment primary key,
	project_id int not null,
	amount double precision not null,
	description text not null,
	foreign key (project_id)
		references project(project_id)
		on delete cascade
);