
# # AI-Based Simulation Content Generation


# ### Imports


# import statements 

import constants as keys
import os
import shutil
import nest_asyncio
import random
from openai import OpenAI
import csv
import requests
import datetime
import numpy as np

from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.chat_models import ChatOpenAI


# ### Environment Setup


nest_asyncio.apply()

os.environ["OPENAI_API_KEY"] = ''

client = OpenAI(
  api_key=os.environ['OPENAI_API_KEY'],  # this is also the default, it can be omitted
)


# change paths before production i.e. remove "ai_"

post_pictures_path = "./ai_post_pictures/"
if os.path.exists(post_pictures_path):
    shutil.rmtree(post_pictures_path)
os.makedirs(post_pictures_path)

profile_pictures_path = "./ai_profile_pictures/"
if os.path.exists(profile_pictures_path):
    shutil.rmtree(profile_pictures_path)
os.makedirs(profile_pictures_path)

input_path = "./ai_input/"
if os.path.exists(input_path):
    shutil.rmtree(input_path)
os.makedirs(input_path)


marginal_replies = []
with open('marginal_replies.csv', 'r', newline='') as file:
    reader = csv.reader(file, delimiter="\n")
    header = next(reader)
    for reply in reader:
        marginal_replies.append(reply[0])
    


# ### User Input


# startup variables

actor_general_description = "random generic social media user." # include examples

num_random_actors = 20 # for actors.csv generation
age_range = [18, 45] # range for age of randomly generated actors for actors.csv generation
num_posts_per_actor = [4, 6] # range for num randomly generated posts per randomly generated actor
num_replies_per_post = [4, 6] # range for num randomly generated replies per randomly generated post

num_hours_before_user_join = 24 # length of simulation BEFORE user joins in hours (max is 24)
num_hours_after_user_join = 48 # length of simulation AFTER user joins in hours

num_user_posts = 5
user_likes_per_post = [6, 10] # range for likes per post from user
user_reads_per_post = [8, 12] # range for reads per post from user
user_replies_per_post = [4, 6] # range for replies per post from user

num_user_replies = 5
user_likes_per_reply = [6, 10] # range for likes per reply from user
user_reads_per_reply = [8, 12] # range for reads per reply from user


# ### Helper Methods


# image generation 

def generate_profile_picture(age, gender, name, file_path):
  res = client.images.generate(
    prompt="{} year old {} named {}.".format(age, gender, name),
    n=1, # number of images to generate
    size="256x256",
  )
  # write image to file_path
  with open(profile_pictures_path+file_path, "wb") as f:
    f.write(requests.get(res.data[0].url).content)
  
  return file_path

def generate_post_picture(description, file_path):
  res = client.images.generate(
    prompt=description, 
    n=1, # number of images to generate
    size="256x256",
  )
  # write image to file_path
  with open(post_pictures_path+file_path, "wb") as f:
    f.write(requests.get(res.data[0].url).content)
  
  return file_path


def create_LLM(prompt):
    return LLMChain(llm=ChatOpenAI(temperature=1, model="gpt-4"), prompt=prompt)


random_actor_generation_prompt = PromptTemplate(
    input_variables=["gender", "age", "first_names", "last_names"],
    template = "Please generate a random location in the United States (formatted as city, state abbreviation), a random full name (first and last name) for a {age} year old {gender}, a random social media username (that does not contain the number 20) for this person using only alphanumeric characters. Do not use the following first names: {first_names}. Do not use the following last names: {last_names}. Please format the responses as a comma separated list."
)
random_actor_generation_llm = create_LLM(random_actor_generation_prompt)


actor_description_generation_prompt = PromptTemplate(
    input_variables=["gender", "age", 'name', 'city', 'state', 'description'],
    template = "Please generate a 2 sentence description of a unique, random character that is {age} year old {gender} named {name} from {city}, {state} with the following description: {description}."
)
actor_description_generation_llm = create_LLM(actor_description_generation_prompt)


random_bio_generation_prompt = PromptTemplate(
    input_variables=["gender", "age", 'name', 'city', 'state', 'description'],
    template = "Please generate a 4-10 word Facebook bio for a {age} year old {gender} named {name} from {city}, {state} with the following description: {description}. That does not mention any of their personal information (name, age, location) but instead mentions a randomly generated interest of theirs. Please use emojis. Do not mention Facebook."
)
random_bio_generation_llm = create_LLM(random_bio_generation_prompt)


post_description_generation_prompt = PromptTemplate(
    input_variables=["gender", "age", 'name', 'city', 'state', 'description'],
    template = "Please generate a detailed 1 sentence description of a picture that a {age} year old {gender} named {name} from {city}, {state} would post on Facebook. The description of the poster is as follows: {description}. The picture can be a picture of the poster themselves or places of interest to the poster. Do not include a description of the post's caption, only describe the picture itself. Do not mention Facebook."
)
post_description_generation_llm = create_LLM(post_description_generation_prompt)


caption_generation_prompt = PromptTemplate(
    input_variables=['description'],
    template = "Please generate a 5-15 word caption for a Facebook post with the following description: {description}. Do not mention Facebook or the name of the person pictured."
)
caption_generation_llm = create_LLM(caption_generation_prompt)


reply_generation_prompt = PromptTemplate(
    input_variables=["gender", "age", 'name', 'city', 'state', 'commenter_description', 'post_description'],
    template = "You are a {age} year old {gender} named {name} from {city}, {state} with the following description: {commenter_description}. Generate a 1-2 sentence comment you would leave on the following post: {post_description}. Please use the colloquial style/language of a {age} year old {gender} named {name} from {city}, {state}. Do not mention the name of the person who posted the post."
)
reply_generation_llm = create_LLM(reply_generation_prompt)


# ### Generate Data


actors = {}

first_names = []
last_names = []

for _ in range(num_random_actors):

    try:
        gender = random.choice(['Male', 'Female'])
        age = random.randint(age_range[0], age_range[1])

        valid = False
        while not valid:
            actor_info = random_actor_generation_llm.run({'gender':gender, 'age':age, 'first_names':first_names, 'last_names':last_names}).replace("\n", '').replace("@", '').replace("\"", "").replace("\'", "")
            city, state, name, username = actor_info.split(', ')
            first_name, last_name = name.split(" ")
            if first_name not in first_names and last_name not in last_names:
                first_names.append(first_name)
                last_names.append(last_name)
                valid = True

        description = actor_description_generation_llm.run({'gender':gender, 'age':age, 'city':city, 'state':state, 'name':name, 'description':actor_general_description}).replace("\n", '').replace("\"", '')

        bio = random_bio_generation_llm.run({'gender':gender, 'age':age, 'city':city, 'state':state, 'name':name, 'description':description}).replace("\n", '').replace("\"", '')

        profile_picture = generate_profile_picture(age, gender, name, username+".jpg")

        actors[username] = {'gender':gender, 'age':age, 'city':city, 'state':state, 'name':name, 'bio':bio, 'description':description, 'picture':profile_picture}

    except: 
        logger.info("actor generation failed.")


posts = {}

post_id = 0
for actor in actors:
    for _ in range(random.randint(num_posts_per_actor[0], num_posts_per_actor[1])):

        try:
            post_description = post_description_generation_llm.run(actors[actor]).replace("\n", '')
            picture = generate_post_picture(post_description, str(post_id)+".jpg")

            rng = random.random()
            if rng < num_hours_before_user_join/(num_hours_before_user_join+num_hours_after_user_join): # post before user joined
                post_hour = str(random.randint(0,num_hours_before_user_join)) 
                post_min = str(random.randint(0,60))
                post_sec = str(random.randint(0,60))
                if len(post_hour) == 1: post_hour = "0" + post_hour
                if len(post_min) == 1: post_min = "0" + post_min
                if len(post_sec) == 1: post_sec = "0" + post_sec
                time = "-" + post_hour + ":" + post_min + ":" + post_sec
            else: # post after user joined
                post_hour = str(random.randint(0,num_hours_after_user_join))
                post_min = str(random.randint(0,60))
                post_sec = str(random.randint(0,60))
                if len(post_hour) == 1: post_hour = "0" + post_hour
                if len(post_min) == 1: post_min = "0" + post_min
                if len(post_sec) == 1: post_sec = "0" + post_sec
                time = post_hour + ":" + post_min + ":" + post_sec

            caption = caption_generation_llm.run({'description':post_description}).replace("\n", '').replace("\"", '')

            posts[post_id] = {'caption':caption, 'post_description':post_description, 'actor':actor, 'picture':picture, 'time':time}
            post_id += 1
        except: # might fail with some issue with the prompt, if so just don't include the post
            pass


replies = {}

id = 0
for post_id in posts:
    for actor in random.sample(actors.keys(), random.randint(num_replies_per_post[0], num_replies_per_post[1])):

        if actor == posts[post_id]["actor"]: # actor cannot comment on their own post
            continue

        reply = reply_generation_llm.run({'gender':actors[actor]["gender"], 'age':actors[actor]["age"], 'city':actors[actor]["city"], 'state':actors[actor]["state"], 'name':actors[actor]["name"], 'commenter_description':actors[actor]["description"], 'post_description':posts[post_id]["post_description"]}).replace("\n", '').replace("\"", '')
        reply_class = ""

        if posts[post_id]["time"][0] == "-" : # before user joins
            post_hour = int(posts[post_id]["time"][0:3])
            post_min = int(posts[post_id]["time"][4:6])
            post_sec = int(posts[post_id]["time"][7:])
        else: # after user joins
            post_hour = int(posts[post_id]["time"][:2])
            post_min = int(posts[post_id]["time"][3:5])
            post_sec = int(posts[post_id]["time"][6:])
        post_time = datetime.timedelta(hours=post_hour, minutes=post_min, seconds=post_sec).total_seconds()
        end_time = datetime.timedelta(hours=num_hours_after_user_join, minutes=post_min, seconds=post_sec).total_seconds()
        delta = end_time - post_time
        reply_time = post_time + min(delta, int(abs(np.random.normal(0, 60*60))))
        
        time = "" if reply_time >= 0 else "-"
        reply_time = abs(reply_time)
        reply_hour = str(int(reply_time // (60*60)))
        reply_time = reply_time % (60*60)
        reply_min = str(int(reply_time // 60))
        reply_time = reply_time % 60
        reply_sec = str(int(reply_time))
        if len(reply_hour) == 1: reply_hour = "0" + reply_hour
        if len(reply_min) == 1: reply_min = "0" + reply_min
        if len(reply_sec) == 1: reply_sec = "0" + reply_sec
        time += reply_hour + ":" + reply_min + ":" + reply_sec

        replies[id] = {"actor":actor, 'body': reply, 'postID':post_id, 'time':time, 'class':reply_class}
        id += 1


# notifications (reply)

notifications_replies = {}
id = 0
for i in range(num_user_posts):
    num_replies = random.randint(user_replies_per_post[0], user_replies_per_post[1])
    for actor in random.sample(actors.keys(), min(len(actors.keys()), num_replies)):
        userPostID = i
        post_description = "Some generic Facebook post by some unnamed Facebook user."
        reply = reply_generation_llm.run({'gender':actors[actor]["gender"], 'age':actors[actor]["age"], 'city':actors[actor]["city"], 'state':actors[actor]["state"], 'name':actors[actor]["name"], 'commenter_description':actors[actor]["description"], 'post_description':post_description}).replace("\n", '').replace("\"", '')
        reply_class = ""
        time = str(random.randint(0,60))
        time = "0:"+time if len(time) > 1 else "0:0"+time
        notifications_replies[id] = {"userPostID":userPostID, "body":reply, "actor":actor, "time":time, "class":reply_class}
        id += 1


# notifications (read, like)

notifications_read_like = {}
for i in range(num_user_posts): # reads and likes for userPosts
    num_reads = random.randint(user_reads_per_post[0], user_reads_per_post[1])
    num_likes = random.randint(user_likes_per_post[0], user_likes_per_post[1])
    curr_like_count = 0
    for actor in random.sample(actors.keys(), min(len(actors.keys()), num_reads)):
        userPost = str(i)
        userReply = ""
        time = str(min(59, int(abs(np.random.normal(0, 20)))))
        time = "0:"+time if len(time) > 1 else "0:0"+time
        if curr_like_count < num_likes:
            notifications_read_like[(userPost, userReply, "like")] = {"actor":actor, "time":time}
            curr_like_count += 1
        notifications_read_like[(userPost, userReply, "read")] = {"actor":actor, "time":time}

for i in range(num_user_replies): # reads and likes for userReplies
    num_reads = random.randint(user_reads_per_reply[0], user_reads_per_reply[1])
    num_likes = random.randint(user_likes_per_reply[0], user_likes_per_reply[1])
    curr_like_count = 0
    for actor in random.sample(actors.keys(), min(len(actors.keys()), num_reads)):
        userPost = ""
        userReply = str(i)
        time = str(min(59, int(abs(np.random.normal(0, 20)))))
        time = "0:"+time if len(time) > 1 else "0:0"+time
        if curr_like_count < num_likes:
            notifications_read_like[(userPost, userReply, "like")] = {"actor":actor, "time":time}
            curr_like_count += 1
        notifications_read_like[(userPost, userReply, "read")] = {"actor":actor, "time":time}


# ### Write Data to CSVs


with open(input_path+'actors.csv', 'w', newline='') as file:
     writer = csv.writer(file)
     writer.writerow(["username", "name", "gender", "age", "location", "bio", "picture", "class"])
     for actor in actors:
         username = actor
         name = actors[actor]["name"]
         gender = actors[actor]["gender"]
         age = actors[actor]["age"]
         location = actors[actor]["city"] + ", " + actors[actor]["state"]
         bio = actors[actor]["bio"]
         picture = actors[actor]["picture"]
         writer.writerow([username, name, gender, age, location, bio, picture, ""])


with open(input_path+'posts.csv', 'w', newline='') as file:
     writer = csv.writer(file)
     writer.writerow(["id", "body", "picture", "actor", "time", "class"])
     for post_id in posts:
         id = post_id
         body = posts[post_id]["caption"]
         picture = posts[post_id]["picture"]
         actor = posts[post_id]["actor"]
         time = posts[post_id]["time"]
         writer.writerow([id, body, picture, actor, time, "normal"])


with open(input_path+'replies.csv', 'w', newline='') as file:
     writer = csv.writer(file)
     writer.writerow(["id", "body", "actor", "postID", "time", "class"])
     for id in replies:
         body = replies[id]["body"]
         actor = replies[id]["actor"]
         postID = replies[id]["postID"]
         time = replies[id]["time"]
         writer.writerow([id, body, actor, postID, time, replies[id]["class"]])


with open(input_path+'notifications (reply).csv', 'w', newline='') as file:
     writer = csv.writer(file)
     writer.writerow(["id", "userPostID", "body", "actor", "time", "class"])
     for id in notifications_replies:
        userPostID = notifications_replies[id]["userPostID"]
        body = notifications_replies[id]["body"]
        actor = notifications_replies[id]["actor"]
        time = notifications_replies[id]["time"]
        writer.writerow([id, userPostID, body, actor, time, notifications_replies[id]["class"]])


with open(input_path+'notifications (read, like).csv', 'w', newline='') as file:
     writer = csv.writer(file)
     writer.writerow(["userPost", "userReply", "type", "actor", "time"])
     for key in notifications_read_like:
        userPost = key[0]
        userReply = key[1]
        type = key[2]
        actor = notifications_read_like[key]["actor"]
        time = notifications_read_like[key]["time"]
        writer.writerow([userPost, userReply, type, actor, time])