create table if not exists user (
	user_id int primary key auto_increment,
	username varchar(200) not null unique,
	email text not null,
	location text
);