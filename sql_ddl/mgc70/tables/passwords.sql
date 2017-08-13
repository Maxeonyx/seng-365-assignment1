create table passwords (
	user_id int primary key,
	password text,
	foreign key (user_id) references users(id)
);