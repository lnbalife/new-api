/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

package model

// Province 省份表（数据已导入，只读）
type Province struct {
	Id   int    `json:"id" gorm:"primaryKey;autoIncrement"`
	Code string `json:"code" gorm:"type:varchar(20);uniqueIndex"`
	Name string `json:"name" gorm:"type:varchar(50);not null"`
}

func (Province) TableName() string {
	return "province"
}

// City 城市表（数据已导入，只读）
type City struct {
	Id         int    `json:"id" gorm:"primaryKey;autoIncrement"`
	Code       string `json:"code" gorm:"type:varchar(20);uniqueIndex"`
	Name       string `json:"name" gorm:"type:varchar(50);not null"`
	ProvinceId int    `json:"province_id" gorm:"index"`
}

func (City) TableName() string {
	return "city"
}

// District 区县表（数据已导入，只读）
type District struct {
	Id     int    `json:"id" gorm:"primaryKey;autoIncrement"`
	Code   string `json:"code" gorm:"type:varchar(20);uniqueIndex"`
	Name   string `json:"name" gorm:"type:varchar(50);not null"`
	CityId int    `json:"city_id" gorm:"index"`
}

func (District) TableName() string {
	return "district"
}
