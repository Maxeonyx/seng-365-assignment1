create table if not exists creator (
	creator_id int auto_increment primary key,
	project_id int not null,
	user_id int not null,
	name text,
	foreign key (project_id) references project(project_id),
	foreign key (user_id) references user(user_id)
);