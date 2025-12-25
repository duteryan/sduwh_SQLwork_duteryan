from fastapi import FastAPI, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import pyodbc
import jwt
import datetime

# uvicorn app:app --reload

# ===== 数据库连接 =====
connection_string = (
    'DRIVER={ODBC Driver 17 for SQL Server};'
    'SERVER=LAPTOP-05MI2SGJ;'
    'DATABASE=Xian_Yv_SQL;'
    'Trusted_Connection=yes;'
)

def get_conn():
    return pyodbc.connect(connection_string)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex='https?://.*',
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== 数据模型 =====
class LoginData(BaseModel):
    username: str
    password: str

class RegisterData(BaseModel):
    username: str
    password: str
    real_name: str
    phone: str
    email: str

class Item(BaseModel):
    item_id: int
    title: str
    price: float
    seller_id: int
    seller_name: str
    status: str

class PublishItem(BaseModel):
    title: str
    description: str
    price: float
    quantity: int
    category_id: int
    seller_id: int

class AddressCreate(BaseModel):
    recipient: str
    phone: str
    detail_address: str

SECRET_KEY = "your-secret-key-123456"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 180 # Token有效期180min


# 登录接口
@app.post("/api/login")
def login(data: LoginData):
    conn = get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT UserID, RealName, Role FROM Users WHERE Username=? AND Password=?",
            (data.username, data.password)
        )
        user = cursor.fetchone()
        if user:
            access_token_expires = datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = jwt.encode(
                {
                    "sub": str(user[0]),
                    "username": data.username,
                    "role": user[2],
                    "exp": datetime.datetime.utcnow() + access_token_expires
                },
                SECRET_KEY,
                algorithm=ALGORITHM
            )
            return {
                "success": True,
                "user_id": user[0],
                "real_name": user[1],
                "role": user[2],
                "access_token": access_token,
                "token_type": "bearer"
            }
        else:
            return {"success": False, "message": "用户名或密码错误"}
    finally:
        conn.close()

# 验证Token接口
@app.post("/api/verify-token")
def verify_token(token: str):
    conn = get_conn()
    cursor = conn.cursor()
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        username = payload.get("username")
        cursor.execute("SELECT RealName FROM Users WHERE UserID=? AND Username=?", (user_id, username))
        user = cursor.fetchone()
        if user:
            return {
                "success": True,
                "user_id": user_id,
                "username": username,
                "real_name": user[0]
            }
        else:
            return {"success": False}
    except jwt.ExpiredSignatureError:
        return {"success": False, "message": "Token已过期"}
    except jwt.InvalidTokenError:
        return {"success": False, "message": "无效Token"}
    finally:
        conn.close()

# 注册接口
@app.post("/api/register")
def register(data: RegisterData):
    conn = get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT UserID FROM Users WHERE Username=?", (data.username,))
        if cursor.fetchone():
            return {"success": False, "message": "用户名已存在"}
        cursor.execute("""
            INSERT INTO Users (Username, Password, RealName, Phone, Email, Role)
            VALUES (?, ?, ?, ?, ?, 'student')
        """, (data.username, data.password, data.real_name, data.phone, data.email))
        conn.commit()
        return {"success": True, "message": "注册成功"}
    finally:
        conn.close()

# 商品接口
@app.get("/api/items")
def get_items(
        seller: str = None,
        category_id: int = None,
        keyword: str = None,
        sort: str = None
):
    conn = get_conn()
    cursor = conn.cursor()

    sql = """
    SELECT 
        i.ItemID, i.Title, i.Price, i.Quantity, i.Views,
        u.Username AS SellerName
    FROM Item i
    JOIN Users u ON i.SellerID = u.UserID
    WHERE i.Status = 'available'
    """
    params = []

    if category_id:
        sql += " AND i.CategoryID = ?"
        params.append(category_id)
    if keyword:
        sql += " AND i.Title LIKE ?"
        params.append(f'%{keyword}%')
    if seller:
        sql += " AND u.Username LIKE ?"
        params.append(f'%{seller}%')

    if sort == "price_asc":
        sql += " ORDER BY i.Price ASC"
    elif sort == "price_desc":
        sql += " ORDER BY i.Price DESC"
    elif sort == "views_desc":
        sql += " ORDER BY i.Views DESC"
    else:
        sql += " ORDER BY i.PublishDate DESC"

    cursor.execute(sql, params)
    items = []
    for r in cursor.fetchall():
        items.append({
            "item_id": r[0],
            "title": r[1],
            "price": float(r[2]),
            "quantity": r[3],
            "views": r[4],
            "seller_name": r[5]
        })
    conn.close()
    return {"success": True, "items": items}

# 商品分类统计接口
@app.get("/api/items/category-stats")
def get_category_stats():
    conn = get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT 
                c.CategoryID, 
                c.Name, 
                COUNT(i.ItemID) AS ItemCount,
                AVG(i.Price) AS AvgPrice,
                SUM(i.Quantity) AS TotalQuantity
            FROM Category c
            LEFT JOIN Item i ON c.CategoryID = i.CategoryID AND i.Status = 'available'
            GROUP BY c.CategoryID, c.Name
            ORDER BY ItemCount DESC
        """)

        stats = []
        for row in cursor.fetchall():
            stats.append({
                "category_id": row[0],
                "category_name": row[1],
                "item_count": row[2],
                "avg_price": round(float(row[3]), 2) if row[3] else 0,
                "total_quantity": row[4] or 0
            })

        return {"success": True, "stats": stats}
    finally:
        conn.close()

# 高级搜索接口
@app.get("/api/items/advanced-search")
def advanced_search(
        min_price: float = None,
        max_price: float = None,
        category_id: int = None,
        seller_rating: float = None,
        has_image: bool = None,
        sort: str = "date_desc"
):
    conn = get_conn()
    cursor = conn.cursor()
    try:
        sql = """
            SELECT 
                i.ItemID, i.Title, i.Price, i.Quantity, i.Views,
                u.Username AS SellerName,
                c.Name AS CategoryName,
                (SELECT AVG(Rating) FROM Review WHERE SellerID = u.UserID) AS SellerAvgRating
            FROM Item i
            JOIN Users u ON i.SellerID = u.UserID
            JOIN Category c ON i.CategoryID = c.CategoryID
            WHERE i.Status = 'available'
        """
        params = []
        if min_price is not None:
            sql += " AND i.Price >= ?"
            params.append(min_price)
        if max_price is not None:
            sql += " AND i.Price <= ?"
            params.append(max_price)
        if category_id:
            sql += " AND i.CategoryID = ?"
            params.append(category_id)

        if seller_rating is not None:
            sql += """ AND (
                SELECT AVG(Rating) FROM Review WHERE SellerID = u.UserID
            ) >= ?"""
            params.append(seller_rating)
        if has_image is not None:
            if has_image:
                sql += " AND i.ImageUrl IS NOT NULL AND i.ImageUrl != ''"
            else:
                sql += " AND (i.ImageUrl IS NULL OR i.ImageUrl = '')"
        if sort == "price_asc":
            sql += " ORDER BY i.Price ASC"
        elif sort == "price_desc":
            sql += " ORDER BY i.Price DESC"
        elif sort == "rating_desc":
            sql += " ORDER BY (SELECT AVG(Rating) FROM Review WHERE SellerID = u.UserID) DESC"
        elif sort == "views_desc":
            sql += " ORDER BY i.Views DESC"
        else:
            sql += " ORDER BY i.PublishDate DESC"

        cursor.execute(sql, params)
        items = []
        for row in cursor.fetchall():
            items.append({
                "item_id": row[0],
                "title": row[1],
                "price": float(row[2]),
                "quantity": row[3],
                "views": row[4],
                "seller_name": row[5],
                "category_name": row[6],
                "seller_avg_rating": round(float(row[7]), 1) if row[7] else None
            })

        return {"success": True, "items": items}
    finally:
        conn.close()

# 商品详情接口
@app.get("/api/items/{item_id}")
def get_item_detail(item_id: int):
    conn = get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE Item 
            SET Views = Views + 1 
            WHERE ItemID = ?
        """, (item_id,))
        cursor.execute("""
            SELECT i.ItemID, i.Title, i.Description, i.Price, i.Quantity, 
                   i.Status, i.PublishDate, i.Views, u.Username
            FROM Item i
            JOIN Users u ON i.SellerID = u.UserID
            WHERE i.ItemID = ?
        """, (item_id,))
        item = cursor.fetchone()
        conn.commit()

        if item:
            return {
                "success": True,
                "item": {
                    "item_id": item[0],
                    "title": item[1],
                    "description": item[2],
                    "price": float(item[3]),
                    "quantity": item[4],
                    "status": item[5],
                    "publish_date": item[6].strftime("%Y-%m-%d") if item[6] else None,
                    "views": item[7],
                    "seller_name": item[8]
                }
            }
        else:
            return {"success": False, "message": "商品不存在"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "message": f"获取商品详情失败: {str(e)}"}
    finally:
        conn.close()

# 购买商品接口
@app.post("/api/purchase")
def purchase_item(data: dict):
    conn = get_conn()
    cursor = conn.cursor()
    try:
        item_id = data.get("item_id")
        buyer_id = data.get("buyer_id")
        address_id = data.get("address_id")

        if not item_id or not buyer_id or not address_id:
            return {"success": False, "message": "参数不完整"}
        cursor.execute("""
            SELECT Quantity, Status, Price, Title FROM Item WHERE ItemID = ?
        """, (item_id,))
        item = cursor.fetchone()
        if not item:
            return {"success": False, "message": "商品不存在"}
        quantity, status, price, title = item
        if status != "available" or quantity <= 0:
            return {"success": False, "message": "商品不可购买"}

        cursor.execute("""
            INSERT INTO Orders (BuyerID, ItemID, AddressID, OrderDate, Status, Amount)
            VALUES (?, ?, ?, CAST(GETDATE() AS DATE), 'pending', ?)
        """, (buyer_id, item_id, address_id, price))
        cursor.execute("""
            SELECT OrderID FROM Orders 
            WHERE BuyerID = ? AND ItemID = ? 
            ORDER BY OrderDate DESC 
            OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY
        """, (buyer_id, item_id))

        result = cursor.fetchone()
        if not result:
            raise Exception("无法获取订单ID")
        order_id = result[0]

        cursor.execute("""
            UPDATE Item 
            SET Status = 'ordered' WHERE ItemID = ?
        """, (item_id,))

        current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            INSERT INTO TransactionLog (OrderID, Action, Timestamp, OperatorID, Remarks)
            VALUES (?, '创建订单', ?, ?, ?)
        """, (order_id, current_time, buyer_id, f"购买{title}，金额{price}元"))

        conn.commit()
        return {"success": True, "message": "购买成功", "order_id": order_id}

    except Exception as e:
        conn.rollback()
        return {"success": False, "message": f"购买失败：{str(e)}"}
    finally:
        conn.close()

# 发布商品接口
@app.post("/api/items")
def publish_item(item: PublishItem):
    conn = get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT UserID FROM Users WHERE UserID=?", (item.seller_id,))
        if not cursor.fetchone():
            return {"success": False, "message": "卖家不存在"}
        cursor.execute("SELECT CategoryID FROM Category WHERE CategoryID=?", (item.category_id,))
        if not cursor.fetchone():
            return {"success": False, "message": "分类不存在"}
        cursor.execute("""
            INSERT INTO Item (
                Title, Description, Price, Quantity, Status, 
                PublishDate, Views, SellerID, CategoryID
            ) VALUES (?, ?, ?, ?, 'available', CAST(GETDATE() AS DATE), 0, ?, ?)
        """, (
            item.title, item.description, item.price, item.quantity,
            item.seller_id, item.category_id
        ))
        conn.commit()

        return {"success": True, "message": "商品发布成功"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "message": f"发布失败：{str(e)}"}
    finally:
        conn.close()

# 获取用户信息接口
@app.get("/api/user-info")
def get_user_info(request: Request):
    token = request.headers.get("Authorization", "").replace("bearer ", "")
    conn = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT Username, RealName, Phone, Email 
            FROM Users 
            WHERE UserID = ?
        """, (user_id,))
        user = cursor.fetchone()

        if user:
            return {
                "success": True,
                "user": {
                    "username": user[0],
                    "real_name": user[1],
                    "phone": user[2],
                    "email": user[3]
                }
            }
        return {"success": False, "message": "用户不存在"}

    except jwt.ExpiredSignatureError:
        return {"success": False, "message": "Token已过期"}
    except jwt.InvalidTokenError:
        return {"success": False, "message": "无效Token"}
    except Exception as e:
        return {"success": False, "message": str(e)}
    finally:
        if conn:
            conn.close()

# 获取用户订单接口
@app.get("/api/user-orders")
def get_user_orders(
        request: Request,
        status: str = None,
        sort: str = "date_desc"  #date_asc, date_desc, price_asc, price_desc
):
    token = request.headers.get("Authorization", "").replace("bearer ", "")
    conn = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")

        conn = get_conn()
        cursor = conn.cursor()

        sql = """
            SELECT o.OrderID, i.Title, o.OrderDate, o.Status, o.Amount
            FROM Orders o
            JOIN Item i ON o.ItemID = i.ItemID
            WHERE o.BuyerID = ?
        """
        params = [user_id]
        if status:
            sql += " AND o.Status = ?"
            params.append(status)
        if sort == "date_asc":
            sql += " ORDER BY o.OrderDate ASC"
        elif sort == "price_asc":
            sql += " ORDER BY o.Amount ASC"
        elif sort == "price_desc":
            sql += " ORDER BY o.Amount DESC"
        else:
            sql += " ORDER BY o.OrderDate DESC"
        cursor.execute(sql, params)
        orders = []
        for row in cursor.fetchall():
            orders.append({
                "order_id": row[0],
                "item_title": row[1],
                "order_date": row[2].strftime("%Y-%m-%d") if row[2] else None,
                "status": row[3],
                "amount": float(row[4])
            })
        return {"success": True, "orders": orders}
    except jwt.ExpiredSignatureError:
        return {"success": False, "message": "Token已过期"}
    except jwt.InvalidTokenError:
        return {"success": False, "message": "无效Token"}
    except Exception as e:
        return {"success": False, "message": str(e)}
    finally:
        if conn:
            conn.close()

# 获取用户地址接口
@app.get("/api/user-addresses")
def get_user_addresses(request: Request):
    token = request.headers.get("Authorization", "").replace("bearer ", "")
    conn = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")

        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT AddressID, Recipient, Phone, Detail
            FROM Address
            WHERE UserID = ?
        """, (user_id,))
        addresses = []
        for row in cursor.fetchall():
            addresses.append({
                "address_id": row[0],
                "recipient": row[1],
                "phone": row[2],
                "detail_address": row[3]
            })
        return {"success": True, "addresses": addresses}

    except jwt.ExpiredSignatureError:
        return {"success": False, "message": "Token已过期"}
    except jwt.InvalidTokenError:
        return {"success": False, "message": "无效Token"}
    except Exception as e:
        return {"success": False, "message": str(e)}
    finally:
        if conn:
            conn.close()

@app.post("/api/change-password")
def change_password(data: dict, request: Request):
    token = request.headers.get("Authorization", "").replace("bearer ", "")
    conn = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")

        username = data.get("username")
        old_pwd = data.get("old_password")
        new_pwd = data.get("new_password")

        conn = get_conn()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT UserID FROM Users WHERE UserID=? AND Username=? AND Password=?",
            (user_id, username, old_pwd)
        )
        if not cursor.fetchone():
            return {"success": False, "message": "原密码错误"}

        cursor.execute(
            "UPDATE Users SET Password=? WHERE UserID=?",
            (new_pwd, user_id)
        )
        conn.commit()

        return {"success": True}

    except Exception as e:
        return {"success": False, "message": str(e)}
    finally:
        conn.close()

@app.post("/api/add-address")
def add_address(data: AddressCreate, request: Request):
    token = request.headers.get("Authorization", "").replace("bearer ", "")
    conn = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return {"success": False, "message": "Token 中缺少用户信息"}

        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO Address (UserID, Recipient, Phone, Detail)
            VALUES (?, ?, ?, ?)
        """, (
            user_id,
            data.recipient,
            data.phone,
            data.detail_address
        ))

        conn.commit()
        return {"success": True}

    except Exception as e:
        print("添加地址失败：", e)
        return {"success": False, "message": str(e)}
    finally:
        if conn:
            conn.close()

# 确认收货接口
@app.post("/api/confirm-receipt")
def confirm_receipt(data: dict, request: Request):
    token = request.headers.get("Authorization", "").replace("bearer ", "")
    conn = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        order_id = data.get("order_id")
        if not order_id:
            return {"success": False, "message": "订单ID不能为空"}
        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT o.ItemID, o.Status 
            FROM Orders o 
            WHERE o.OrderID = ? AND o.BuyerID = ?
        """, (order_id, user_id))

        result = cursor.fetchone()
        if not result:
            return {"success": False, "message": "订单不存在或无权操作"}

        item_id, order_status = result
        if order_status not in ["pending", "shipped"]:
            return {"success": False, "message": "该订单不能确认收货"}

        cursor.execute("""
            UPDATE Orders 
            SET Status = 'completed' 
            WHERE OrderID = ?
        """, (order_id,))
        cursor.execute("""
            UPDATE Item 
            SET Status = 'completed' 
            WHERE ItemID = ?
        """, (item_id,))

        cursor.execute("SELECT Title FROM Item WHERE ItemID = ?", (item_id,))
        item_title = cursor.fetchone()[0]

        current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            INSERT INTO TransactionLog (OrderID, Action, Timestamp, OperatorID, Remarks)
            VALUES (?, '确认收货', ?, ?, ?)
        """, (order_id, current_time, user_id, f"确认收到商品：{item_title}"))

        conn.commit()
        return {"success": True, "message": "确认收货成功"}

    except jwt.ExpiredSignatureError:
        return {"success": False, "message": "Token已过期"}
    except jwt.InvalidTokenError:
        return {"success": False, "message": "无效Token"}
    except Exception as e:
        if conn:
            conn.rollback()
        return {"success": False, "message": f"操作失败：{str(e)}"}
    finally:
        if conn:
            conn.close()

# 添加获取"我卖出的"商品接口
@app.get("/api/sold-items")
def get_sold_items(
    request: Request,
    status: str = None,  # 状态筛选：available/ordered/completed/cancelled
    sort: str = "date_desc"
):
    token = request.headers.get("Authorization", "").replace("bearer ", "")
    conn = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        seller_id = payload.get("sub")
        if not seller_id:
            return {"success": False, "message": "无效的用户信息"}

        conn = get_conn()
        cursor = conn.cursor()
        sql = """
            SELECT i.ItemID, i.Title, i.Price, i.PublishDate, i.Status
            FROM Item i
            WHERE i.SellerID = ?
        """
        params = [seller_id]
        if status:
            valid_status = ["available", "ordered", "completed", "cancelled"]
            if status in valid_status:
                sql += " AND i.Status = ?"
                params.append(status)
            else:
                return {"success": False, "message": "无效的状态筛选值"}
        if sort == "date_asc":
            sql += " ORDER BY i.PublishDate ASC"
        elif sort == "price_asc":
            sql += " ORDER BY i.Price ASC"
        elif sort == "price_desc":
            sql += " ORDER BY i.Price DESC"
        else:
            sql += " ORDER BY i.PublishDate DESC"

        cursor.execute(sql, params)
        items = []
        for row in cursor.fetchall():
            items.append({
                "item_id": row[0],
                "title": row[1],
                "price": float(row[2]),
                "publish_date": row[3].strftime("%Y-%m-%d") if row[3] else None,
                "status": row[4]
            })

        return {"success": True, "items": items}

    except jwt.ExpiredSignatureError:
        return {"success": False, "message": "Token已过期"}
    except jwt.InvalidTokenError:
        return {"success": False, "message": "无效Token"}
    except Exception as e:
        return {"success": False, "message": f"查询失败：{str(e)}"}
    finally:
        if conn:
            conn.close()

# 删除商品接口
@app.delete("/api/items/{item_id}")
def delete_item(item_id: int, request: Request):
    token = request.headers.get("Authorization", "").replace("bearer ", "")
    conn = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")

        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT SellerID, Status FROM Item WHERE ItemID = ?
        """, (item_id,))
        item = cursor.fetchone()

        if not item:
            return {"success": False, "message": "商品不存在"}
        seller_id, status = item
        if str(seller_id) != user_id:
            return {"success": False, "message": "没有权限删除该商品"}
        if status != "available":
            return {"success": False, "message": "只有在售商品可以取消"}

        cursor.execute("""
            DELETE FROM TransactionLog 
            WHERE OrderID IN (SELECT OrderID FROM Orders WHERE ItemID = ?)
        """, (item_id,))
        cursor.execute("DELETE FROM Orders WHERE ItemID = ?", (item_id,))
        cursor.execute("DELETE FROM Item WHERE ItemID = ?", (item_id,))

        conn.commit()
        return {"success": True, "message": "商品已成功取消"}

    except jwt.ExpiredSignatureError:
        return {"success": False, "message": "Token已过期"}
    except jwt.InvalidTokenError:
        return {"success": False, "message": "无效Token"}
    except Exception as e:
        if conn:
            conn.rollback()
        return {"success": False, "message": f"删除失败：{str(e)}"}
    finally:
        if conn:
            conn.close()

# 管理员获取所有用户信息接口
@app.get("/api/admin/users")
def get_all_users(request: Request):
    token = request.headers.get("Authorization", "").replace("bearer ", "")
    conn = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        admin_id = payload.get("sub")
        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT role FROM Users WHERE UserID = ?", (admin_id,))
        user_role = cursor.fetchone()
        if not user_role or user_role[0] != 'admin':
            return {"success": False, "message": "权限不足，需要管理员身份"}

        search_mode = request.query_params.get("mode", "")
        search_value = request.query_params.get("value", "")

        base_sql = "SELECT UserID, Username, RealName, Phone, Email, role FROM Users"
        params = []

        if search_mode and search_value:
            field_mapping = {
                "user_id": "UserID",
                "username": "Username",
                "real_name": "RealName",
                "phone": "Phone",
                "email": "Email",
                "role": "role"
            }

            if search_mode in field_mapping:
                field = field_mapping[search_mode]
                if search_mode == "user_id":
                    base_sql += f" WHERE {field} = ?"
                    params.append(search_value)
                else:
                    base_sql += f" WHERE {field} LIKE ?"
                    params.append(f"%{search_value}%")
            else:
                return {"success": False, "message": "不支持的搜索模式"}

        cursor.execute(base_sql, params)
        users = []
        for row in cursor.fetchall():
            users.append({
                "user_id": row[0],
                "username": row[1],
                "real_name": row[2],
                "phone": row[3],
                "email": row[4],
                "role": row[5]
            })

        if search_mode and search_value and not users:
            return {"success": True, "users": [], "message": "未找到匹配的用户"}
        return {"success": True, "users": users}

    except jwt.ExpiredSignatureError:
        return {"success": False, "message": "Token已过期"}
    except jwt.InvalidTokenError:
        return {"success": False, "message": "无效Token"}
    except Exception as e:
        return {"success": False, "message": str(e)}
    finally:
        if conn:
            conn.close()

@app.get("/api/admin/users/{user_id}")
def get_single_user(user_id: int, request: Request):
    token = request.headers.get("Authorization", "").replace("bearer ", "")
    conn = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        admin_id = payload.get("sub")
        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT role FROM Users WHERE UserID = ?", (admin_id,))
        if cursor.fetchone()[0] != 'admin':
            return {"success": False, "message": "权限不足"}
        cursor.execute("""
            SELECT UserID, Username, RealName, Phone, Email, Role 
            FROM Users WHERE UserID = ?
        """, (user_id,))
        user = cursor.fetchone()
        if not user:
            return {"success": False, "message": "用户不存在"}
        return {
            "success": True,
            "user": {
                "user_id": user[0],
                "username": user[1],
                "real_name": user[2],
                "phone": user[3],
                "email": user[4],
                "role": user[5]
            }
        }
    except Exception as e:
        return {"success": False, "message": str(e)}
    finally:
        if conn:
            conn.close()

@app.put("/api/admin/users/{user_id}")
def update_user(user_id: int, data: dict, request: Request):
    token = request.headers.get("Authorization", "").replace("bearer ", "")
    conn = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        admin_id = payload.get("sub")
        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT role FROM Users WHERE UserID = ?", (admin_id,))
        if cursor.fetchone()[0] != 'admin':
            return {"success": False, "message": "权限不足"}

        username = data.get("username")
        real_name = data.get("real_name")
        phone = data.get("phone")
        email = data.get("email")

        if not username or username.strip() == "":
            return {"success": False, "message": "用户名不能为空"}

        cursor.execute("SELECT UserID FROM Users WHERE Username = ? AND UserID != ?", (username, user_id))
        if cursor.fetchone():
            return {"success": False, "message": "用户名已存在，请更换"}

        cursor.execute("""
            UPDATE Users 
            SET Username = ?, RealName = ?, Phone = ?, Email = ? 
            WHERE UserID = ?
        """, (username, real_name, phone, email, user_id))
        conn.commit()

        return {"success": True, "message": "用户信息修改成功"}
    except jwt.ExpiredSignatureError:
        return {"success": False, "message": "Token已过期"}
    except jwt.InvalidTokenError:
        return {"success": False, "message": "无效Token"}
    except Exception as e:
        if conn:
            conn.rollback()
        return {"success": False, "message": str(e)}
    finally:
        if conn:
            conn.close()

@app.delete("/api/admin/users/{user_id}")
def delete_user(user_id: int, request: Request):
    token = request.headers.get("Authorization", "").replace("bearer ", "")
    conn = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        admin_id = payload.get("sub")
        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT role FROM Users WHERE UserID = ?", (admin_id,))
        if cursor.fetchone()[0] != 'admin':
            return {"success": False, "message": "权限不足"}

        cursor.execute("DELETE FROM Item WHERE SellerID = ?", (user_id,))
        cursor.execute("DELETE FROM Orders WHERE BuyerID = ? OR SellerID = ?", (user_id, user_id))
        cursor.execute("DELETE FROM TransactionLog WHERE OperatorID = ?", (user_id,))
        cursor.execute("DELETE FROM UserAddress WHERE UserID = ?", (user_id,))
        cursor.execute("DELETE FROM Users WHERE UserID = ?", (user_id,))

        conn.commit()
        return {"success": True, "message": "用户及关联数据已删除"}
    except Exception as e:
        if conn:
            conn.rollback()
        return {"success": False, "message": str(e)}
    finally:
        if conn:
            conn.close()

@app.get("/api/admin/items")
def get_all_items(request: Request):
    token = request.headers.get("Authorization", "").replace("bearer ", "")
    conn = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        admin_id = payload.get("sub")
        conn = get_conn()
        cursor = conn.cursor()

        cursor.execute("SELECT role FROM Users WHERE UserID = ?", (admin_id,))
        user_role = cursor.fetchone()
        if not user_role or user_role[0] != 'admin':
            return {"success": False, "message": "权限不足，需要管理员身份"}

        search_mode = request.query_params.get("mode", "")
        search_value = request.query_params.get("value", "")
        sort_mode = request.query_params.get("sort", "create_time")

        base_sql = "SELECT ItemID, Title, Price, SellerID, Status, PublishDate, Description FROM Item"
        where_clause = []
        params = []

        if search_mode and search_value:
            field_mapping = {
                "item_id": "ItemID",
                "item_name": "Title",
                "description": "Description",
                "status": "Status"
            }
            if search_mode in field_mapping:
                field = field_mapping[search_mode]
                if search_mode == "item_id":
                    where_clause.append(f"{field} = ?")
                    params.append(search_value)
                else:
                    where_clause.append(f"{field} LIKE ?")
                    params.append(f"%{search_value}%")

        if where_clause:
            base_sql += " WHERE " + " AND ".join(where_clause)

        sort_mapping = {
            "create_time": "PublishDate",
            "price": "Price",
            "item_id": "ItemID"
        }
        sort_field = sort_mapping.get(sort_mode, "CreateTime")
        base_sql += f" ORDER BY {sort_field} DESC"  # 降序/ASC

        cursor.execute(base_sql, params)
        items = []
        for row in cursor.fetchall():
            items.append({
                "item_id": row[0],
                "item_name": row[1],
                "price": row[2],
                "seller_id": row[3],
                "status": row[4],
                "create_time": row[5],
                "description": row[6]
            })

        if search_mode and search_value and not items:
            return {"success": True, "items": [], "message": "未找到匹配的商品"}

        return {"success": True, "items": items}

    except jwt.ExpiredSignatureError:
        return {"success": False, "message": "Token已过期"}
    except jwt.InvalidTokenError:
        return {"success": False, "message": "无效Token"}
    except Exception as e:
        return {"success": False, "message": str(e)}
    finally:
        if conn:
            conn.close()

@app.get("/api/admin/items/{item_id}")
def get_single_item(item_id: int, request: Request):
    token = request.headers.get("Authorization", "").replace("bearer ", "")
    conn = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        admin_id = payload.get("sub")
        conn = get_conn()
        cursor = conn.cursor()

        cursor.execute("SELECT role FROM Users WHERE UserID = ?", (admin_id,))
        if cursor.fetchone()[0] != 'admin':
            return {"success": False, "message": "权限不足"}

        cursor.execute("""
            SELECT ItemID, Title, Price, SellerID, Status, PublishDate, Description, Views
            FROM Item WHERE ItemID = ?
        """, (item_id,))
        item = cursor.fetchone()
        if not item:
            return {"success": False, "message": "商品不存在"}

        return {
            "success": True,
            "item": {
                "item_id": item[0],
                "item_name": item[1],
                "price": item[2],
                "seller_id": item[3],
                "status": item[4],
                "create_time": item[5],
                "description": item[6],
                "view_count": item[7]
            }
        }
    except Exception as e:
        return {"success": False, "message": str(e)}
    finally:
        if conn:
            conn.close()


@app.delete("/api/admin/items/{item_id}")
def delete_item(item_id: int, request: Request):
    token = request.headers.get("Authorization", "").replace("bearer ", "")
    conn = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        admin_id = payload.get("sub")
        conn = get_conn()
        cursor = conn.cursor()

        cursor.execute("SELECT role FROM Users WHERE UserID = ?", (admin_id,))
        if cursor.fetchone()[0] != 'admin':
            return {"success": False, "message": "权限不足"}

        cursor.execute("DELETE FROM Item WHERE ItemID = ?", (item_id,))
        conn.commit()

        return {"success": True, "message": "商品已删除"}
    except Exception as e:
        if conn:
            conn.rollback()
        return {"success": False, "message": str(e)}
    finally:
        if conn:
            conn.close()


@app.post("/api/admin/items/{item_id}/refund")
def refund_item(item_id: int, request: Request):
    token = request.headers.get("Authorization", "").replace("bearer ", "")
    conn = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        admin_id = payload.get("sub")
        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT role FROM Users WHERE UserID = ?", (admin_id,))
        if cursor.fetchone()[0] != 'admin':
            return {"success": False, "message": "权限不足"}
        cursor.execute("UPDATE Item SET Status = 'available' WHERE ItemID = ?", (item_id,))
        cursor.execute("DELETE FROM Orders WHERE ItemID = ?", (item_id,))

        conn.commit()
        return {"success": True, "message": "退货退款处理成功"}
    except Exception as e:
        if conn:
            conn.rollback()
        return {"success": False, "message": str(e)}
    finally:
        if conn:
            conn.close()

@app.get("/api/admin/orders")
def get_all_orders(request: Request):
    token = request.headers.get("Authorization", "").replace("bearer ", "")
    conn = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")

        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT Role FROM Users WHERE UserID = ?", (user_id,))
        role = cursor.fetchone()[0]
        if role != 'admin':
            return {"success": False, "message": "没有管理员权限"}

        cursor.execute("""
            SELECT o.OrderID, o.BuyerID, o.ItemID, i.Title, o.OrderDate, o.Status, o.Amount, o.AddressID
            FROM Orders o
            JOIN Item i ON o.ItemID = i.ItemID
            ORDER BY o.OrderDate DESC
        """)

        orders = []
        for row in cursor.fetchall():
            orders.append({
                "order_id": row[0],
                "buyer_id": row[1],
                "item_id": row[2],
                "item_title": row[3],
                "order_date": row[4].strftime("%Y-%m-%d %H:%M:%S") if row[4] else None,
                "status": row[5],
                "amount": float(row[6]),
                "address_id": row[7]
            })

        return {"success": True, "orders": orders}

    except jwt.ExpiredSignatureError:
        return {"success": False, "message": "Token已过期"}
    except jwt.InvalidTokenError:
        return {"success": False, "message": "无效Token"}
    except Exception as e:
        return {"success": False, "message": f"查询失败：{str(e)}"}
    finally:
        if conn:
            conn.close()