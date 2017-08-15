create table if not exists backer (
	backer_id int auto_increment primary key,
	project_id int not null,
	pledge double precision not null,
	user_id int,
	is_anonymous boolean,
	foreign key (project_id) references project(project_id),
	foreign key (user_id) references user(user_id)
);