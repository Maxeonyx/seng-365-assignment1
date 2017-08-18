create table if not exists session (
	user_id int primary key,
	create_time timestamp not null default now(),
	token varchar(138) not null,
	foreign key (user_id)
		references user(user_id)
		on delete cascade
);