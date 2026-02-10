export interface Waiter {
  id: string;
  restaurant_id: string;
  full_name: string;
  nickname: string;
  profile_photo_url: string;
  user_id?: string | null;
}

export interface Restaurant {
  id: string;
  name: string;
}
