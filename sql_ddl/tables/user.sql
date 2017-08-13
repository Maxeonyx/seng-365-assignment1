create table if not exists user (
	id int primary key auto_increment,
	username text not null,
	email text not null,
	location text
);