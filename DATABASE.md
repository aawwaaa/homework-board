# Subject

id TEXT PRIMARY KEY
name TEXT
color TEXT
config TEXT

# Assignment

id TEXT PRIMART KEY
subject TEXT

created INTEGER // unix ms
deadline INTEGER // unix ms

estimulated INT
spent INT

title TEXT
description TEXT
priority INT
config TEXT

# Student

id TEXT PRIMARY KEY
name TEXT
group TEXT

# Submission

id TEXT PRIMARY KEY
assignment TEXT
student TEXT
spent INT?
feedback TEXT?
created INTEGER // unix ms

# Day

date TEXT PRIMARY KEY // yyyy-MM-dd
assignment TEXT
subject TEXT
taken INT
