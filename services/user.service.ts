import jwt from "jsonwebtoken";
import { User } from "./../models/user.model";
import { MongoClient, Collection, InsertOneResult } from "mongodb";
import bcrypt from "bcrypt";
import { ObjectID } from "bson";
export default class UserService {
  constructor(private userCollection: Collection) {}

  static async injectDB(connection: MongoClient) {
    try {
      if (this.prototype.userCollection) {
        return;
      } else {
        this.prototype.userCollection = connection
          .db(process.env.DB_NAME)
          .collection("users");
      }
    } catch (error) {
      throw error;
    }
  }

  static register(newUser: User): Promise<boolean> {
    return new Promise((reslove, reject) => {
      this.isUserExisted(newUser.username).then((existed: boolean) => {
        if (!existed) {
          bcrypt.hash(
            newUser.password ? newUser.password : "",
            10,
            async (err: Error | undefined, hash: string) => {
              newUser = { ...newUser, password: hash };
              this.prototype.userCollection
                .insertOne({
                  ...newUser,
                  _id: new ObjectID(),
                })
                .then((res: InsertOneResult<User>) => {
                  reslove(res.insertedId != null);
                })
                .catch((err) => reject(err));
              if (err) reject(err);
            }
          );
        } else {
          reject(new Error("Username has already used"));
        }
      });
    });
  }

  private static async isUserExisted(username: string) {
    const result = await this.prototype.userCollection.findOne<User>({
      username,
    });
    if (result) return true;
    else return false;
  }

  static async authentication(username: string, password: string) {
    const user: User | null = await this.prototype.userCollection.findOne<User>(
      { username }
    );
    if (!user) throw new Error("Username existed");
    else if (user) {
      try {
        return new Promise((reslove, reject) => {
          bcrypt.compare(
            password,
            user.password,
            (error: any, result: boolean) => {
              if (error) throw error;
              if (result) {
                const resUser = { _id: user._id, username: username , role: user.role};
                if (process.env.JWT_SECRET_KEY) {
                  const accessToken = jwt.sign(
                    resUser,
                    process.env.JWT_SECRET_KEY,
                    {
                      expiresIn: "5h",
                    }
                  );
                  if (accessToken) {
                    reslove({ accessToken });
                  } else {
                    reject(new Error("Can not generate access token "));
                  }
                } else {
                  reject(new Error("Missing jwt secret key"));
                }
              } else reject(new Error("Wrong password"));
            }
          );
        });
      } catch (error) {
        throw error;
      }
    }
  }
  static login(username: string, password: string): Promise<User> {
    return new Promise(async (reslove, reject) => {
      try {
        const user: User | null =
          await this.prototype.userCollection.findOne<User>({
            username,
          });
        if (user) {
          bcrypt.compare(
            password,
            user.password ? user.password : "",
            (err: any, result: any) => {
              if (result) {
                reslove({
                  username,
                  _id: user._id,
                  email_address: user.email_address,
                  phone_number: user.phone_number,
                } as User);
              } else {
                reject(new Error("Wrong Password"));
              }
              if (err) {
                reject(new Error("ERROR"));
              }
            }
          );
        } else {
          throw new Error("User not existed");
        }
      } catch (error) {
        reject(error);
      }
    });
  }
}
